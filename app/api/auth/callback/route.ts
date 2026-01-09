import { getSafeRedirectPath } from "@/lib/utils/redirect";
import { createClient } from "@/lib/utils/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  const supabase = await createClient();

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery, redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(
          new URL("/reset-password", requestUrl.origin)
        );
      }
      // Otherwise redirect to the next URL or board
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Handle token_hash flow (for email links without PKCE)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      // If this is a password recovery, redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(
          new URL("/reset-password", requestUrl.origin)
        );
      }
      // Otherwise redirect to the next URL or board
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no valid params, redirect to sign-in with error
  return NextResponse.redirect(
    new URL("/sign-in?error=auth_callback_error", requestUrl.origin)
  );
}
