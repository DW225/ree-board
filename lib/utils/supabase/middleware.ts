import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import invariant from "tiny-invariant";

/**
 * Updates and refreshes the Supabase session in middleware
 *
 * Based on official Supabase SSR documentation:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * This function:
 * 1. Creates a Supabase client for middleware
 * 2. Refreshes the user session by calling getUser()
 * 3. Updates cookies in both request and response
 * 4. Redirects authenticated users away from /sign-in
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse with updated cookies or redirect
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  invariant(
    url && key,
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment variables",
  );
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: getUser() refreshes the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Special handling for sign-in page: redirect authenticated users to /board
  if (pathname === "/sign-in" && user) {
    // User is authenticated and trying to access sign-in page
    // Check if there's a redirect parameter they were trying to reach
    const redirectParam = request.nextUrl.searchParams.get("redirect");

    // If redirect exists and is a safe internal path, use it; otherwise go to /board
    const destination =
      redirectParam?.startsWith("/") &&
      !redirectParam.startsWith("//") &&
      !redirectParam.startsWith("/\\")
        ? redirectParam
        : "/board";

    const redirectUrl = new URL(destination, request.url);

    // Create redirect response and copy cookies
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
