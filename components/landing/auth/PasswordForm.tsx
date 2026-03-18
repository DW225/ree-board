import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import type { RefObject, SubmitEvent } from "react";
import { GRADIENT_BTN } from "./constants";

interface PasswordFormProps {
  isSignUp: boolean;
  name: string;
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
  siteKey: string | undefined;
  captchaToken: string | null;
  turnstileRef: RefObject<TurnstileInstance | null>;
  onSubmit: (e: SubmitEvent) => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSwitchToSignIn: () => void;
  onCaptchaSuccess: (token: string) => void;
  onCaptchaError: () => void;
  onCaptchaExpire: () => void;
}

export function PasswordForm({
  isSignUp,
  name,
  email,
  password,
  showPassword,
  loading,
  error,
  siteKey,
  captchaToken,
  turnstileRef,
  onSubmit,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSwitchToSignIn,
  onCaptchaSuccess,
  onCaptchaError,
  onCaptchaExpire,
}: Readonly<PasswordFormProps>) {
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  const submitLoadingLabel = isSignUp ? "Creating account..." : "Signing in...";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Full name (sign-up only) */}
      {isSignUp && (
        <div className="space-y-1.5">
          <Label
            htmlFor="name"
            className="text-[13px] font-medium text-[#374151]"
          >
            Full name
          </Label>
          <div className="flex items-center h-11 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3">
            <User size={16} className="text-[#94A3B8] shrink-0" />
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Andrew Lee"
              required
              disabled={loading}
              className="flex-1 h-full border-0 rounded-none shadow-none focus-visible:ring-0 px-2 bg-transparent text-[#1E293B] placeholder:text-[#CBD5E1]"
            />
          </div>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-[13px] font-medium text-[#374151]"
        >
          Email address
        </Label>
        <div className="flex items-center h-11 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3">
          <Mail size={16} className="text-[#94A3B8] shrink-0" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="andrew@example.com"
            required
            autoComplete="email"
            disabled={loading}
            className="flex-1 h-full border-0 rounded-none shadow-none focus-visible:ring-0 px-2 bg-transparent text-[#1E293B] placeholder:text-[#CBD5E1]"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-[13px] font-medium text-[#374151]"
          >
            Password
          </Label>
          {isSignUp ? (
            <Button
              type="button"
              variant="link"
              onClick={onSwitchToSignIn}
              className="h-auto p-0 text-xs text-[#6366F1]"
            >
              Already have an account?
            </Button>
          ) : (
            <Button
              variant="link"
              size="sm"
              asChild
              className="h-auto p-0 text-xs text-[#6366F1]"
            >
              <Link href="/sign-in">Forgot password?</Link>
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between h-11 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3">
          <div className="flex items-center flex-1 min-w-0">
            <Lock size={16} className="text-[#94A3B8] shrink-0" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={loading}
              className="flex-1 h-full border-0 rounded-none shadow-none focus-visible:ring-0 px-2 bg-transparent text-[#1E293B] placeholder:text-[#CBD5E1]"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onTogglePassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="h-auto w-auto p-0 text-[#94A3B8] hover:text-[#64748B] hover:bg-transparent shrink-0"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
      </div>

      {/* CAPTCHA */}
      {siteKey && (
        <div className="flex justify-center">
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            onSuccess={onCaptchaSuccess}
            onError={onCaptchaError}
            onExpire={onCaptchaExpire}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={loading || (siteKey ? !captchaToken : false)}
        className={GRADIENT_BTN}
      >
        {loading ? submitLoadingLabel : submitLabel}
        {!loading && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
