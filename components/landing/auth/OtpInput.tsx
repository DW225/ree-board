import { Label } from "@/components/ui/label";
import type { RefObject } from "react";

interface OtpInputProps {
  otp: string[];
  otpRefs: RefObject<(HTMLInputElement | null)[]>;
  loading: boolean;
  onOtpChange: (index: number, value: string) => void;
  onOtpKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  onOtpPaste: (e: React.ClipboardEvent) => void;
}

export function OtpInput({
  otp,
  otpRefs,
  loading,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
}: Readonly<OtpInputProps>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[13px] font-medium text-[#374151]">
          Verification code
        </Label>
        <span className="text-xs text-[#94A3B8]">Check your email</span>
      </div>
      <div className="flex justify-center gap-2" onPaste={onOtpPaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              otpRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            aria-label={`Digit ${i + 1} of verification code`}
            onChange={(e) => onOtpChange(i, e.target.value)}
            onKeyDown={(e) => onOtpKeyDown(i, e)}
            disabled={loading}
            className={`w-11 h-14 text-center text-lg font-semibold text-[#1E293B] bg-[#F8FAFC] rounded-lg outline-none transition-colors ${
              i === 0 && digit === ""
                ? "border-2 border-[#6366F1]"
                : "border border-[#E2E8F0] focus:border-2 focus:border-[#6366F1]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
