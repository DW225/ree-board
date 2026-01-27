import { getSafeRedirectPath } from "@/lib/utils/redirect";
import { createClient } from "@/lib/utils/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const safeNext = getSafeRedirectPath(next);

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirect(safeNext);
    }
  }


  // Return the user to an error page with some instructions
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/sign-in";
  redirectTo.searchParams.delete("next"); // SECURITY: Remove next parameter to prevent open redirect in error path
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.set("error", "auth_error");
  redirectTo.searchParams.set(
    "error_description",
    "The link is invalid or has expired"
  );
  return NextResponse.redirect(redirectTo);
}
