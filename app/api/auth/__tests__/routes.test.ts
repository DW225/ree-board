/**
 * Tests for auth route handlers - callback and confirm routes
 *
 * These tests verify:
 * 1. Open redirect vulnerability is prevented
 * 2. Valid redirects to allowed paths work correctly
 * 3. Token exchange flows behave correctly
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// Mock the Supabase client
interface MockAuthResult {
  error: Error | null;
}

const mockExchangeCodeForSession =
  jest.fn<(code: string) => Promise<MockAuthResult>>();
const mockVerifyOtp =
  jest.fn<
    (params: {
      token_hash: string;
      type: EmailOtpType;
    }) => Promise<MockAuthResult>
  >();

jest.mock("@/lib/utils/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: mockVerifyOtp,
      },
    })
  ),
}));

describe("Auth Callback Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("Open Redirect Prevention", () => {
    it.each([
      [
        "rejects absolute external URLs",
        "&next=https://evil.com/steal",
        "/board",
      ],
      ["rejects protocol-relative URLs", "&next=//evil.com/path", "/board"],
      ["rejects javascript URLs", "&next=javascript:alert(1)", "/board"],
      ["accepts valid relative paths", "&next=/board/123", "/board/123"],
      ["defaults to /board when next is missing", "", "/board"],
    ])("%s", async (_name, nextParameter, expectedPath) => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        `http://localhost:3000/api/auth/callback?code=test-code${nextParameter}`
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3000${expectedPath}`
      );
    });
  });

  describe("Error Handling", () => {
    it("should redirect to sign-in with error when code exchange fails", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=invalid-code"
      );

      mockExchangeCodeForSession.mockResolvedValue({
        error: new Error("Invalid code"),
      });

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain(
        "http://localhost:3000/?error=auth_callback_error"
      );
      expect(location).toContain("error=");
    });
  });

  describe("Recovery Flow", () => {
    it("should redirect to reset-password page for recovery type", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=test-code&type=recovery"
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/reset-password"
      );
    });
  });
});
