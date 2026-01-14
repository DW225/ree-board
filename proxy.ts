import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/utils/supabase/middleware";

/**
 * Next.js proxy (middleware) for authentication and session management
 *
 * Uses Supabase for authentication with support for:
 * - Regular authenticated users
 * - Anonymous guest users
 * - Public routes (landing page, invite links, sign-in)
 */
export async function proxy(request: NextRequest) {
  // Public routes that don't require authentication
  const publicPaths = [
    "/",
    "/sign-in",
    "/reset-password",
    "/invite",
    "/api/kinde-webhook", // TODO: Remove after full Kinde migration
    "/api/auth/callback",
    "/api/auth/confirm",
  ];

  const { pathname } = request.nextUrl;

  // Check if this is a public path
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Update session (refresh cookies) and get user for all requests
  const { response, user } = await updateSession(request);

  // For protected routes, check if user is authenticated
  if (!isPublic && !user) {
    // No user on protected route - redirect to sign-in
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};