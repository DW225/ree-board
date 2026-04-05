"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Github, Shield, Zap } from "lucide-react";
import { CheckEmailCard } from "./auth/CheckEmailCard";
import type { SigninTab } from "./auth/constants";
import { MagicLinkForm } from "./auth/MagicLinkForm";
import { PasswordForm } from "./auth/PasswordForm";
import { useAuthForm } from "./auth/useAuthForm";
import { useOtpInput } from "./auth/useOtpInput";

function SignInTabBar({
  signinTab,
  onSwitch,
  disabled = false,
}: Readonly<{
  signinTab: SigninTab;
  onSwitch: (tab: SigninTab) => void;
  disabled?: boolean;
}>) {
  return (
    <div className="flex border-b border-[#E2E8F0] -mx-10 px-10">
      <button
        type="button"
        onClick={() => onSwitch("password")}
        disabled={disabled}
        className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
          signinTab === "password"
            ? "text-[#6366F1] border-b-2 border-[#6366F1] -mb-px"
            : "text-[#94A3B8]"
        }`}
      >
        Password
      </button>
      <button
        type="button"
        onClick={() => onSwitch("magic-link")}
        disabled={disabled}
        className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
          signinTab === "magic-link"
            ? "text-[#6366F1] border-b-2 border-[#6366F1] -mb-px"
            : "text-[#94A3B8]"
        }`}
      >
        Magic Link
      </button>
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="flex items-center gap-5">
      <span className="text-[#CBD5E1] text-sm">·</span>
      <div className="flex items-center gap-1.5">
        <Shield size={13} className="text-[#94A3B8]" />
        <span className="text-xs text-[#94A3B8]">No credit card required</span>
      </div>
      <span className="text-[#CBD5E1] text-sm">·</span>
      <div className="flex items-center gap-1.5">
        <Zap size={13} className="text-[#94A3B8]" />
        <span className="text-xs text-[#94A3B8]">Setup in 60 seconds</span>
      </div>
    </div>
  );
}

export default function AuthCard() {
  const otpControls = useOtpInput();
  const auth = useAuthForm(otpControls);

  if (auth.checkEmail) {
    return (
      <CheckEmailCard
        email={auth.email}
        onBackToSignIn={() => auth.switchMode("signin")}
      />
    );
  }

  const captchaCallbacks = {
    onCaptchaSuccess: (token: string) => auth.setCaptchaToken(token),
    onCaptchaError: () => {
      auth.setError("CAPTCHA verification failed. Please try again.");
      auth.setCaptchaToken(null);
    },
    onCaptchaExpire: () => auth.setCaptchaToken(null),
  };

  const signinHeading = auth.isOtpStage
    ? "Sign in without a password"
    : "Welcome back";
  const signinSubheading = auth.isOtpStage
    ? "We'll email you a one-time code to sign in"
    : "Sign in to your ReeBoard account";

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-5">
      <Card className="w-full rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border-[#E2E8F0] p-10 space-y-5">
        {/* Header */}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-[#1E293B] tracking-[-0.5px]">
            {auth.isSignUp ? "Start for free" : signinHeading}
          </h2>
          <p className="text-sm text-[#64748B]">
            {auth.isSignUp
              ? "Create your ReeBoard account"
              : signinSubheading}
          </p>
        </div>

        {/* Sign-in tab bar */}
        {!auth.isSignUp && (
          <SignInTabBar
            signinTab={auth.signinTab}
            onSwitch={auth.switchSigninTab}
            disabled={auth.loading}
          />
        )}

        {/* Password sign-in / sign-up form */}
        {(auth.isSignUp || auth.signinTab === "password") && (
          <PasswordForm
            isSignUp={auth.isSignUp}
            name={auth.name}
            email={auth.email}
            password={auth.password}
            showPassword={auth.showPassword}
            loading={auth.loading}
            error={auth.error}
            siteKey={auth.siteKey}
            captchaToken={auth.captchaToken}
            turnstileRef={auth.turnstileRef}
            onSubmit={auth.isSignUp ? auth.handleSignUp : auth.handleSignIn}
            onNameChange={auth.setName}
            onEmailChange={auth.setEmail}
            onPasswordChange={auth.setPassword}
            onTogglePassword={() => auth.setShowPassword((v) => !v)}
            onSwitchToSignIn={() => auth.switchMode("signin")}
            {...captchaCallbacks}
          />
        )}

        {/* Magic Link form */}
        {!auth.isSignUp && auth.signinTab === "magic-link" && (
          <MagicLinkForm
            email={auth.email}
            loading={auth.loading}
            error={auth.error}
            isOtpStage={auth.isOtpStage}
            otp={otpControls.otp}
            otpRefs={otpControls.otpRefs}
            siteKey={auth.siteKey}
            captchaToken={auth.captchaToken}
            turnstileRef={auth.turnstileRef}
            onSubmit={
              auth.isOtpStage ? auth.handleVerifyOtp : auth.handleSendOtp
            }
            onEmailChange={auth.setEmail}
            onOtpChange={otpControls.handleOtpChange}
            onOtpKeyDown={otpControls.handleOtpKeyDown}
            onOtpPaste={otpControls.handleOtpPaste}
            {...captchaCallbacks}
          />
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E2E8F0]" />
          <span className="text-[13px] text-[#94A3B8]">or</span>
          <div className="flex-1 h-px bg-[#E2E8F0]" />
        </div>

        {/* Resend row (magic link OTP stage only) */}
        {auth.isOtpStage && (
          <div className="flex items-center justify-center gap-1 -mt-1">
            <span className="text-[13px] text-[#64748B]">
              Didn&apos;t receive the code?
            </span>
            <Button
              type="button"
              variant="link"
              onClick={auth.handleResendOtp}
              disabled={auth.loading}
              className="h-auto p-0 text-[13px] font-semibold text-[#6366F1]"
            >
              Try again
            </Button>
          </div>
        )}

        {/* GitHub button (disabled) */}
        <Button
          type="button"
          variant="outline"
          disabled
          className="w-full h-11 text-[#1E293B] bg-[#F9FAFB] border-[#E2E8F0] hover:bg-[#F9FAFB]"
        >
          <Github size={18} />
          Continue with GitHub
        </Button>

        {/* Toggle link */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm text-[#64748B]">
            {auth.isSignUp
              ? "Already have an account?"
              : "Don't have an account?"}
          </span>
          <Button
            type="button"
            variant="link"
            onClick={() =>
              auth.switchMode(auth.isSignUp ? "signin" : "signup")
            }
            disabled={auth.loading}
            className="h-auto p-0 text-sm font-semibold text-[#6366F1]"
          >
            {auth.isSignUp ? "Sign in" : "Sign up free"}
          </Button>
        </div>
      </Card>

      {/* Trust badges */}
      <TrustBadges />
    </div>
  );
}
