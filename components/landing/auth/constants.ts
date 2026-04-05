export type Mode = "signup" | "signin";
export type SigninTab = "password" | "magic-link";
export type MagicLinkStage = "email" | "otp";

export const EMPTY_OTP: string[] = ["", "", "", "", "", ""];

export const GRADIENT_BTN =
  "w-full h-12 rounded-[10px] text-[15px] font-semibold text-white bg-[linear-gradient(90deg,#6366F1_0%,#7C3AED_100%)] hover:bg-[linear-gradient(90deg,#6366F1_0%,#7C3AED_100%)] hover:opacity-90";
