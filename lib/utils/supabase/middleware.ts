import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
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
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse with updated cookies and optional user
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  invariant(
    url && key,
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment variables"
  );

  // Create a response to start with
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client configured for middleware
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Set cookies on the request for Server Components
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        // Create new response with updated cookies
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        // Set cookies on the response for the browser
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Refresh session by calling getUser()
  // This validates the auth token on the Supabase server
  // NEVER use getSession() in middleware - it doesn't revalidate the token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}