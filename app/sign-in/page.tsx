"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/utils/supabase/client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

type AuthMode = "password" | "otp" | "forgot-password";
type Step = "email" | "otp-verify" | "reset-sent";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (siteKey && !captchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: captchaToken ?? undefined,
        },
      });

      if (error) {
        setError(error.message);
        resetCaptcha();
      } else {
        router.push("/board");
      }
    } catch (exception) {
      console.error("Unexpected error during password sign-in:", exception);
      setError("An unexpected error occurred. Please try again.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (siteKey && !captchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          captchaToken: captchaToken ?? undefined,
        },
      });

      if (error) {
        setError(error.message);
        resetCaptcha();
      } else {
        setStep("otp-verify");
      }
    } catch (exception) {
      console.error("Unexpected error sending OTP:", exception);
      setError("An unexpected error occurred. Please try again.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        setError(error.message);
      } else {
        router.push("/board");
      }
    } catch (exception) {
      console.error("Unexpected error verifying OTP:", exception);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (siteKey && !captchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        captchaToken: captchaToken ?? undefined,
      });

      if (error) {
        setError(error.message);
        resetCaptcha();
      } else {
        setStep("reset-sent");
      }
    } catch (exception) {
      console.error("Unexpected error sending password reset:", exception);
      setError("An unexpected error occurred. Please try again.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setError("");
    resetCaptcha();
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setStep("email");
    setError("");
    setPassword("");
    setOtp("");
    resetCaptcha();
  };

  const getSubmitButtonText = useCallback(
    (isLoading: boolean, mode: AuthMode): string => {
      if (isLoading) {
        return mode === "password" ? "Signing in..." : "Sending...";
      }
      switch (mode) {
        case "password":
          return "Sign In";
        case "otp":
          return "Send Sign-In Code";
        case "forgot-password":
          return "Send Reset Link";
      }
    },
    []
  );

  const getFormSubmitHandler = (mode: AuthMode) => {
    switch (mode) {
      case "password":
        return handlePasswordSignIn;
      case "otp":
        return handleSendOTP;
      case "forgot-password":
        return handleForgotPassword;
    }
  };

  // OTP Verification step
  if (step === "otp-verify") {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-100">
        <div className="w-full max-w-md mx-auto p-8">
          <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Check Your Email
            </h1>
            <p className="text-slate-600 mb-6">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-700">
                  Enter Code
                </Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replaceAll(/\D/g, ""))}
                  placeholder="123456"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full text-center text-xl tracking-widest"
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
                disabled={loading || otp.length !== 6}
                className="w-full bg-slate-600 hover:bg-slate-700"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToEmail}
                className="w-full text-slate-600 hover:text-slate-800"
                disabled={loading}
              >
                Change Email
              </Button>
            </form>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Didn&apos;t receive the code? Check your spam folder or try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password reset email sent step
  if (step === "reset-sent") {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-100">
        <div className="w-full max-w-md mx-auto p-8">
          <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Check Your Email
            </h1>
            <p className="text-slate-600 mb-6">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Click the link in the email to set a new password. If you
              don&apos;t see it, check your spam folder.
            </p>
            <Button
              onClick={() => switchMode("password")}
              className="w-full bg-slate-600 hover:bg-slate-700"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main email/password/OTP form
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-100">
      <div className="w-full max-w-md mx-auto p-8">
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">
            {authMode === "forgot-password" ? "Reset Password" : "Sign In"}
          </h1>

          {/* Mode switcher tabs */}
          {authMode !== "forgot-password" && (
            <div className="flex mb-6 border-b border-slate-200">
              <button
                type="button"
                onClick={() => switchMode("password")}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  authMode === "password"
                    ? "border-slate-600 text-slate-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => switchMode("otp")}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  authMode === "otp"
                    ? "border-slate-600 text-slate-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Email Code
              </button>
            </div>
          )}

          <form onSubmit={getFormSubmitHandler(authMode)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full"
                disabled={loading}
              />
            </div>

            {authMode === "password" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-700">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot-password")}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                  disabled={loading}
                />
              </div>
            )}

            {siteKey && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => {
                    setError("CAPTCHA verification failed. Please try again.");
                    setCaptchaToken(null);
                  }}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || (siteKey ? !captchaToken : false)}
              className="w-full bg-slate-600 hover:bg-slate-700"
            >
              {getSubmitButtonText(loading, authMode)}
            </Button>

            {authMode === "forgot-password" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => switchMode("password")}
                className="w-full text-slate-600 hover:text-slate-800"
                disabled={loading}
              >
                Back to Sign In
              </Button>
            )}
          </form>

          {authMode === "otp" && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              We&apos;ll send a 6-digit code to your email. No password needed!
            </p>
          )}

          {authMode === "forgot-password" && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <Link
              href="/"
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
