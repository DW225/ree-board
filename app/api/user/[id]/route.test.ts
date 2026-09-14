/// <reference types="jest" />
import { GET } from "./route";
import { db } from "@/lib/db/client";
import { createClient } from "@/lib/utils/supabase/server";
import type * as Libsql from "@libsql/client";
import type * as Drizzle from "drizzle-orm/libsql";
import { NextRequest } from "next/server";

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

const client = db.$client;
const mockGetUser = jest.fn();
const request = (id: string) =>
  GET(new NextRequest(`https://board.example/api/user/${id}`), {
    params: Promise.resolve({ id }),
  });

beforeAll(async () => {
  await client.executeMultiple(`
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT, email TEXT, supabase_id TEXT, is_guest INTEGER, guest_expires_at INTEGER, created_at INTEGER);
    CREATE TABLE member (id TEXT PRIMARY KEY, user_id TEXT, board_id TEXT, role INTEGER);
    INSERT INTO user(id, name, email, supabase_id) VALUES
      ('actor', 'Actor', 'actor@example.com', 'auth-actor'),
      ('peer', 'Peer', 'peer@example.com', 'auth-peer'),
      ('outsider', 'Outsider', 'outsider@example.com', 'auth-outsider');
  `);
});

beforeEach(async () => {
  jest
    .mocked(createClient)
    .mockResolvedValue({ auth: { getUser: mockGetUser } } as unknown as Awaited<
      ReturnType<typeof createClient>
    >);
  mockGetUser.mockResolvedValue({
    data: { user: { id: "auth-actor" } },
    error: null,
  });
  await client.executeMultiple(`DELETE FROM member;
    INSERT INTO member VALUES ('a', 'actor', 'board-a', 1), ('p', 'peer', 'board-a', 2), ('o', 'outsider', 'board-b', 0);`);
});

it.each(["actor", "peer"])(
  "returns only name and avatar for %s",
  async (id) => {
    const response = await request(id);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: {
        name: id === "actor" ? "Actor" : "Peer",
        avatar_url: expect.any(String),
      },
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
);

it.each(["outsider", "missing"])("does not disclose %s", async (id) => {
  const response = await request(id);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ message: "User not found" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("revokes profile access when shared membership is removed", async () => {
  expect((await request("peer")).status).toBe(200);
  await client.execute("DELETE FROM member WHERE user_id = 'actor'");
  expect((await request("peer")).status).toBe(404);
  expect((await request("actor")).status).toBe(200);
});

it("does not confuse a local ID with a Supabase ID", async () => {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "actor" } },
    error: null,
  });
  expect((await request("actor")).status).toBe(404);
});

it("rejects missing authentication", async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await request("peer");
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("allows a board guest to read a shared profile", async () => {
  await client.execute("UPDATE member SET role = 2 WHERE user_id = 'actor'");
  expect((await request("peer")).status).toBe(200);
});

it("rejects an empty ID", async () => {
  expect((await request(" ")).status).toBe(400);
});

it("does not return profile data when authentication fails", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation();
  try {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Unavailable" },
    });
    const response = await request("peer");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  } finally {
    spy.mockRestore();
  }
});
