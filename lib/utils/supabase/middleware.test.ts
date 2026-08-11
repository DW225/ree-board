import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

interface MockCookie {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    path: string;
  };
}

interface MockClientOptions {
  cookies: {
    setAll(cookies: MockCookie[]): void;
  };
}

const authenticatedUser = { id: "user-1" } as User;
const mockGetUser = jest.fn<
  () => Promise<{ data: { user: User | null } }>
>();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(
    (_url: string, _key: string, options: MockClientOptions) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll([
            {
              name: "sb-session",
              value: "refreshed",
              options: { httpOnly: true, path: "/" },
            },
          ]);
          return mockGetUser();
        },
      },
    }),
  ),
}));

describe("updateSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    mockGetUser.mockResolvedValue({ data: { user: authenticatedUser } });
  });

  it("redirects authenticated root requests to a safe internal destination", async () => {
    const redirect = encodeURIComponent("/board/board-1?tab=summary");
    const request = new NextRequest(
      `http://localhost:3000/?redirect=${redirect}`,
    );

    const { response, user } = await updateSession(request);

    expect(user).toBe(authenticatedUser);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/board/board-1?tab=summary",
    );
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it.each([
    "/\n/evil.example",
    "/\r/evil.example",
    "/\t/evil.example",
    "//evil.example",
    "/\\evil.example",
    "//",
    "///",
    "//[",
  ])(
    "rejects an unsafe redirect payload",
    async (redirect) => {
      const request = new NextRequest(
        `http://localhost:3000/?redirect=${encodeURIComponent(redirect)}`,
      );

      const { response } = await updateSession(request);

      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/board",
      );
      expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    },
  );
});
