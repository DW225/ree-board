import { useRef, useState } from "react";
import { EMPTY_OTP } from "./constants";

export function useOtpInput() {
  const [otp, setOtp] = useState([...EMPTY_OTP]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetOtp = () => setOtp([...EMPTY_OTP]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replaceAll(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData
      .getData("text")
      .replaceAll(/\D/g, "")
      .slice(0, 6);
    const next = [...otp];
    digits.split("").forEach((d, i) => {
      next[i] = d;
    });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const focusFirst = () => {
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  return {
    otp,
    otpRefs,
    resetOtp,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    focusFirst,
  };
}
