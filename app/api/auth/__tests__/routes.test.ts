/**
 * Tests for auth route handlers - callback and confirm routes
 *
 * These tests verify:
 * 1. Open redirect vulnerability is prevented
 * 2. Valid redirects to allowed paths work correctly
 * 3. Token exchange flows behave correctly
 */

import { NextRequest } from "next/server";

// Mock the Supabase client
const mockExchangeCodeForSession = jest.fn();
const mockVerifyOtp = jest.fn();

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
    it("should reject absolute external URLs in next parameter", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=test-code&next=https://evil.com/steal"
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      // Should redirect to /board instead of the malicious URL
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/board"
      );
    });

    it("should reject protocol-relative URLs", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=test-code&next=//evil.com/path"
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      // Should redirect to /board instead of the malicious URL
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/board"
      );
    });

    it("should reject URLs with javascript protocol", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=test-code&next=javascript:alert(1)"
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      // Should redirect to /board
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/board"
      );
    });

    it("should accept valid relative paths", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=test-code&next=/board/123"
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/board/123"
      );
    });

    it("should default to /board when next parameter is missing", async () => {
      const { GET } = await import("../callback/route");
      const request = new NextRequest(
        "http://localhost:3000/api/auth/callback?code=test-code"
      );

      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/board"
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
      expect(location).toContain("/sign-in");
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
