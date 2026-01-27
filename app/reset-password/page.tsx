"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { createClient } from "@/lib/utils/supabase/client";
import { PasswordSchema } from "@/lib/utils/validation/password";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const SUCCESS_REDIRECT_DELAY = 2000; // 2 seconds

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabaseRef = useRef(createClient());
  const router = useRouter();
  const { session } = useSupabaseSession();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordValidation = PasswordSchema.safeParse(password);
    if (!passwordValidation.success) {
      setError(passwordValidation.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabaseRef.current.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      // Redirect to board after a short delay
      setTimeout(() => {
        router.push("/board");
      }, SUCCESS_REDIRECT_DELAY);
    } catch (exception) {
      console.error("Unexpected error updating password:", exception);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const pageClasses =
    "relative min-h-screen flex flex-col items-center justify-center bg-slate-100";
  const cardWrapperClasses = "w-full max-w-md mx-auto p-8";
  const cardClasses =
    "bg-white border border-slate-200 rounded-lg p-8 shadow-sm";

  // Loading state while checking session
  if (session === null) {
    return (
      <div className={pageClasses}>
        <div className={cardWrapperClasses}>
          <div className={cardClasses}>
            <p className="text-slate-600 text-center">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid or expired reset link
  if (!session) {
    return (
      <div className={pageClasses}>
        <div className={cardWrapperClasses}>
          <div className={cardClasses}>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              Invalid or Expired Link
            </h1>
            <p className="text-slate-600 mb-6">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
            <Link href="/sign-in">
              <Button className="w-full bg-slate-600 hover:bg-slate-700">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className={pageClasses}>
        <div className={cardWrapperClasses}>
          <div className={cardClasses}>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              Password Updated!
            </h1>
            <p className="text-slate-600 mb-6">
              Your password has been successfully updated. Redirecting you to
              the dashboard...
            </p>
            <Link href="/board">
              <Button className="w-full bg-slate-600 hover:bg-slate-700">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className={pageClasses}>
      <div className={cardWrapperClasses}>
        <div className={cardClasses}>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Set New Password
          </h1>
          <p className="text-slate-600 mb-6">Enter your new password below.</p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                New Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-slate-600 hover:bg-slate-700"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Password must be at least 8 characters with lowercase, uppercase,
            digit, and symbol.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <Link
              href="/sign-in"
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
