/// <reference types="jest" />
import { useEffect } from "react";
import type * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import AuthCard from "./AuthCard";

jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  useEffect: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@marsidev/react-turnstile", () => ({ Turnstile: () => null }));
jest.mock("./auth/useAuthForm", () => ({
  useAuthForm: () => ({ checkEmail: true, email: "member@example.invalid" }),
}));
jest.mock("./auth/useOtpInput", () => ({ useOtpInput: jest.fn() }));

it.each([
  ["auth_callback_error", "Authentication failed. Please try again."],
  ["invalid_link", "The link is invalid or has expired."],
  ["unknown", "Something went wrong. Please try again."],
  ["__proto__", "Something went wrong. Please try again."],
  ["constructor", "Something went wrong. Please try again."],
  ["toString", "Something went wrong. Please try again."],
  ["__defineGetter__", "Something went wrong. Please try again."],
  ["valueOf", "Something went wrong. Please try again."],
  ["", null],
])(
  "shows only a known message or the fallback for error=%s",
  (error, message) => {
    jest.clearAllMocks();
    const replace = jest.fn();
    jest
      .mocked(useRouter)
      .mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    jest
      .mocked(useSearchParams)
      .mockReturnValue(
        new URLSearchParams({ error }) as ReturnType<typeof useSearchParams>
      );

    AuthCard();
    jest.mocked(useEffect).mock.calls[0][0]();

    if (message === null) {
      expect(toast.error).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
      return;
    }
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(replace).toHaveBeenCalledWith("/");
  }
);
