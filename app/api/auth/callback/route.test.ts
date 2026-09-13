/// <reference types="jest" />
import { GET } from "./route";

jest.mock("@/lib/utils/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
      verifyOtp: async () => ({ error: null }),
    },
  }),
}));

afterEach(() => jest.restoreAllMocks());

it.each(["code=test", "token_hash=test&type=email"])(
  "keeps %s redirects on the application origin",
  async (auth) => {
    jest.spyOn(console, "warn").mockImplementation();
    for (const next of [
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r/evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\u0000/evil.example",
    ]) {
      const response = await GET(
        new Request(
          `https://board.example/api/auth/callback?${auth}&next=${encodeURIComponent(next)}`
        )
      );
      expect(response.headers.get("location")).toBe(
        "https://board.example/board"
      );
    }
  }
);

it("preserves a safe destination with query and fragment", async () => {
  const response = await GET(
    new Request(
      "https://board.example/api/auth/callback?code=test&next=%2Fboard%2Fone%3Fview%3Dall%23posts"
    )
  );
  expect(response.headers.get("location")).toBe(
    "https://board.example/board/one?view=all#posts"
  );
});
