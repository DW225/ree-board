import { createClient } from "@/lib/utils/supabase/client";
import { PasswordSchema } from "@/lib/utils/validation/password";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { MagicLinkStage, Mode, SigninTab } from "./constants";

export function useAuthForm(otpControls: {
  resetOtp: () => void;
  focusFirst: () => void;
  otp: string[];
}) {
  const [mode, setMode] = useState<Mode>("signup");
  const [signinTab, setSigninTab] = useState<SigninTab>("password");
  const [magicLinkStage, setMagicLinkStage] = useState<MagicLinkStage>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setPassword("");
    setName("");
    setShowPassword(false);
    setCheckEmail(false);
    setSigninTab("password");
    setMagicLinkStage("email");
    otpControls.resetOtp();
    resetCaptcha();
  };

  const switchSigninTab = (tab: SigninTab) => {
    setSigninTab(tab);
    setError("");
    setMagicLinkStage("email");
    otpControls.resetOtp();
    resetCaptcha();
  };

  const handleSignUp = async (e: SubmitEvent) => {
    e.preventDefault();

    if (siteKey && !captchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    const result = PasswordSchema.safeParse(password);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          captchaToken: captchaToken ?? undefined,
        },
      });

      if (error) {
        setError(error.message);
        resetCaptcha();
      } else if (data.session) {
        router.push("/board");
      } else {
        setCheckEmail(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: SubmitEvent) => {
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
        options: { captchaToken: captchaToken ?? undefined },
      });

      if (error) {
        setError(error.message);
        resetCaptcha();
      } else {
        router.push("/board");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: SubmitEvent) => {
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
        options: { captchaToken: captchaToken ?? undefined },
      });
      if (error) {
        setError(error.message);
        resetCaptcha();
      } else {
        setMagicLinkStage("otp");
        otpControls.resetOtp();
        resetCaptcha();
        otpControls.focusFirst();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    otpControls.resetOtp();
    setError("");
    setMagicLinkStage("email");
  };

  const handleVerifyOtp = async (e: SubmitEvent) => {
    e.preventDefault();
    const token = otpControls.otp.join("");
    if (token.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/board");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === "signup";
  const isMagicLink = signinTab === "magic-link";
  const isOtpStage = isMagicLink && magicLinkStage === "otp";

  return {
    // State
    mode,
    signinTab,
    magicLinkStage,
    name,
    email,
    password,
    showPassword,
    loading,
    error,
    checkEmail,
    captchaToken,
    turnstileRef,
    siteKey,
    // Derived
    isSignUp,
    isMagicLink,
    isOtpStage,
    // Setters
    setName,
    setEmail,
    setPassword,
    setShowPassword,
    setError,
    setCaptchaToken,
    // Actions
    switchMode,
    switchSigninTab,
    resetCaptcha,
    handleSignUp,
    handleSignIn,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
  };
}
