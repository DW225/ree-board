/// <reference types="jest" />
import { POST } from "./route";
import { db } from "@/lib/db/client";
import { getUserBySupabaseId } from "@/lib/db/user";
import { createClient } from "@/lib/utils/supabase/server";
import type * as Libsql from "@libsql/client";
import type * as Drizzle from "drizzle-orm/libsql";

jest.mock("@/lib/db/user", () => ({ getUserBySupabaseId: jest.fn() }));
jest.mock("@/lib/utils/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/db/client", () => {
  const client = jest
    .requireActual<typeof Libsql>("@libsql/client")
    .createClient({ url: "file::memory:" });
  afterAll(() => client.close());
  return {
    db: jest
      .requireActual<typeof Drizzle>("drizzle-orm/libsql")
      .drizzle(client),
  };
});
const mockCreateTokenRequest = jest.fn();
jest.mock("ably", () => ({
  Rest: jest.fn(() => ({
    auth: { createTokenRequest: mockCreateTokenRequest },
  })),
}));

const originalKey = process.env.ABLY_API_KEY;
beforeAll(async () => {
  process.env.ABLY_API_KEY = "test-only";
  await db.$client.execute(
    "CREATE TABLE member (board_id TEXT, user_id TEXT, role INTEGER)"
  );
});
afterAll(() => {
  if (originalKey === undefined) delete process.env.ABLY_API_KEY;
  else process.env.ABLY_API_KEY = originalKey;
});
beforeEach(async () => {
  jest.clearAllMocks();
  await db.$client.execute("DELETE FROM member");
  jest.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: { id: "supabase-actor" } },
        error: null,
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  jest
    .mocked(getUserBySupabaseId)
    .mockResolvedValue({ id: "actor" } as Awaited<
      ReturnType<typeof getUserBySupabaseId>
    >);
  mockCreateTokenRequest.mockResolvedValue({ signed: true });
});

it("grants only subscribe for each permitted board, for all board roles", async () => {
  await db.$client.executeMultiple(`
    INSERT INTO member VALUES ('owned', 'actor', 0), ('joined', 'actor', 1), ('readonly', 'actor', 2);
    INSERT INTO member VALUES ('private', 'other-user', 0), ('invalid-role', 'actor', 99);
  `);
  expect((await POST()).status).toBe(200);
  expect(mockCreateTokenRequest).toHaveBeenCalledWith({
    capability: {
      "board:owned": ["subscribe"],
      "board:joined": ["subscribe"],
      "board:readonly": ["subscribe"],
    },
    clientId: "actor",
    ttl: 60_000,
  });
});

it.each(["*", "board:*", "foo:bar", "bad\nboard", "board\n", "", "bad board"])(
  "does not grant unsafe board ID %j",
  async (boardId) => {
    await db.$client.execute({
      sql: "INSERT INTO member VALUES (?, 'actor', 1)",
      args: [boardId],
    });
    expect((await POST()).status).toBe(403);
    expect(mockCreateTokenRequest).not.toHaveBeenCalled();
  }
);

it("rejects users without memberships and reevaluates removed access", async () => {
  await db.$client.execute("INSERT INTO member VALUES ('joined', 'actor', 1)");
  expect((await POST()).status).toBe(200);
  mockCreateTokenRequest.mockClear();
  await db.$client.execute("DELETE FROM member");
  expect((await POST()).status).toBe(403);
  expect(mockCreateTokenRequest).not.toHaveBeenCalled();
});

it("rejects unauthenticated users", async () => {
  jest.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  expect((await POST()).status).toBe(401);
  expect(mockCreateTokenRequest).not.toHaveBeenCalled();
});

it("rejects a missing internal account", async () => {
  jest.mocked(getUserBySupabaseId).mockResolvedValue(undefined);
  expect((await POST()).status).toBe(401);
  expect(mockCreateTokenRequest).not.toHaveBeenCalled();
});
