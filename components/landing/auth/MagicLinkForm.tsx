import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { ArrowRight, Info, Mail } from "lucide-react";
import type { RefObject, SubmitEvent } from "react";
import { GRADIENT_BTN } from "./constants";
import { OtpInput } from "./OtpInput";

interface MagicLinkFormProps {
  email: string;
  loading: boolean;
  error: string;
  isOtpStage: boolean;
  otp: string[];
  otpRefs: RefObject<(HTMLInputElement | null)[]>;
  siteKey: string | undefined;
  captchaToken: string | null;
  turnstileRef: RefObject<TurnstileInstance | null>;
  onSubmit: (e: SubmitEvent) => void;
  onEmailChange: (value: string) => void;
  onOtpChange: (index: number, value: string) => void;
  onOtpKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  onOtpPaste: (e: React.ClipboardEvent) => void;
  onCaptchaSuccess: (token: string) => void;
  onCaptchaError: () => void;
  onCaptchaExpire: () => void;
}

export function MagicLinkForm({
  email,
  loading,
  error,
  isOtpStage,
  otp,
  otpRefs,
  siteKey,
  captchaToken,
  turnstileRef,
  onSubmit,
  onEmailChange,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
  onCaptchaSuccess,
  onCaptchaError,
  onCaptchaExpire,
}: Readonly<MagicLinkFormProps>) {
  const magicLinkLabel = isOtpStage ? "Verify code" : "Send code";
  const magicLinkLoadingLabel = isOtpStage ? "Verifying..." : "Sending code...";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <Label
          htmlFor="ml-email"
          className="text-[13px] font-medium text-[#374151]"
        >
          Email address
        </Label>
        <div className="flex items-center h-11 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3">
          <Mail size={16} className="text-[#94A3B8] shrink-0" />
          <Input
            id="ml-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="andrew@example.com"
            required
            autoComplete="email"
            disabled={loading || isOtpStage}
            className="flex-1 h-full border-0 rounded-none shadow-none focus-visible:ring-0 px-2 bg-transparent text-[#1E293B] placeholder:text-[#CBD5E1] disabled:opacity-70"
          />
        </div>
      </div>

      {/* Hint box */}
      <div className="flex items-start gap-2 bg-[#EEF2FF] rounded-lg px-3 py-2.5">
        <Info size={14} className="text-[#6366F1] shrink-0 mt-0.5" />
        <p className="text-xs text-[#4F46E5]">
          Enter your email and we&apos;ll send a 6-digit code
        </p>
      </div>

      {/* OTP input (shown after code is sent) */}
      {isOtpStage && (
        <OtpInput
          otp={otp}
          otpRefs={otpRefs}
          loading={loading}
          onOtpChange={onOtpChange}
          onOtpKeyDown={onOtpKeyDown}
          onOtpPaste={onOtpPaste}
        />
      )}

      {/* CAPTCHA (email stage only) */}
      {siteKey && !isOtpStage && (
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
        disabled={loading || (!isOtpStage && siteKey ? !captchaToken : false) || (isOtpStage && otp.some((d) => !d))}
        className={GRADIENT_BTN}
      >
        {loading ? magicLinkLoadingLabel : magicLinkLabel}
        {!loading && <ArrowRight size={16} />}
      </Button>
    </form>
  );
}
