import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/utils/supabase/middleware";
import { proxy } from "@/proxy";

jest.mock("@/lib/utils/supabase/middleware", () => ({
  updateSession: jest.fn(),
}));

const mockUpdateSession = jest.mocked(updateSession);
const authenticatedUser = { id: "user-1" } as User;

describe("proxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects unauthenticated protected requests and preserves refreshed cookies", async () => {
    const request = new NextRequest("http://localhost:3000/board/board-1");
    const sessionResponse = NextResponse.next();
    sessionResponse.cookies.set("sb-session", "refreshed");
    mockUpdateSession.mockResolvedValue({
      response: sessionResponse,
      user: null,
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?redirect=%2Fboard%2Fboard-1",
    );
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("lets unauthenticated users access the root route", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const sessionResponse = NextResponse.next();
    mockUpdateSession.mockResolvedValue({
      response: sessionResponse,
      user: null,
    });

    const response = await proxy(request);

    expect(mockUpdateSession).toHaveBeenCalledWith(request);
    expect(response).toBe(sessionResponse);
  });

  it("returns the authenticated root redirect from the session updater", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const sessionResponse = NextResponse.redirect(
      "http://localhost:3000/board",
    );
    mockUpdateSession.mockResolvedValue({
      response: sessionResponse,
      user: authenticatedUser,
    });

    const response = await proxy(request);

    expect(response).toBe(sessionResponse);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/board",
    );
  });

  it("continues to bypass session checks for other public routes", async () => {
    const request = new NextRequest("http://localhost:3000/reset-password");

    const response = await proxy(request);

    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
