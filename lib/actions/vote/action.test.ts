/// <reference types="jest" />
import { Role } from "@/lib/constants/role";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db/client";
import { DownVotePostAction, UpVotePostAction } from "./action";
import type * as Libsql from "@libsql/client";
import type * as Drizzle from "drizzle-orm/libsql";
import type * as Crypto from "node:crypto";
import type * as Fs from "node:fs";
import type * as Os from "node:os";
import type * as Path from "node:path";

jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({ logger: { debug: jest.fn() } }));
jest.mock("nanoid", () => ({
  nanoid: () => jest.requireActual<typeof Crypto>("node:crypto").randomUUID(),
}));
jest.mock("@/lib/db/client", () => {
  const { createClient } = jest.requireActual<typeof Libsql>("@libsql/client");
  const { drizzle } = jest.requireActual<typeof Drizzle>("drizzle-orm/libsql");
  const { mkdtempSync, rmSync } = jest.requireActual<typeof Fs>("node:fs");
  const { tmpdir } = jest.requireActual<typeof Os>("node:os");
  const { join } = jest.requireActual<typeof Path>("node:path");
  const directory = mkdtempSync(join(tmpdir(), "ree-board-vote-"));
  const client = createClient({ url: `file:${join(directory, "test.db")}` });
  afterAll(() => {
    client.close();
    rmSync(directory, { recursive: true });
  });
  return {
    db: drizzle(client),
    withDbRetry: <T>(operation: () => Promise<T>) => operation(),
  };
});

const mockPublish = jest.fn();
const mockChannel = jest.fn<{ publish: typeof mockPublish }, [string]>(() => ({
  publish: mockPublish,
}));
jest.mock("@/lib/utils/ably", () => ({
  ablyClient: (boardId: string) => mockChannel(boardId),
  EVENT_TYPE: { POST: { UPVOTE: "POST_UPVOTE", DOWNVOTE: "POST_DOWNVOTE" } },
}));

const client = db.$client;
const actions = [
  { name: "upvote", run: UpVotePostAction, count: 2, event: "POST_UPVOTE" },
  {
    name: "downvote",
    run: DownVotePostAction,
    count: 0,
    event: "POST_DOWNVOTE",
  },
];

beforeAll(async () => {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT, email TEXT);
    CREATE TABLE board (id TEXT PRIMARY KEY);
    CREATE TABLE member (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES user(id),
      board_id TEXT REFERENCES board(id), role INTEGER NOT NULL,
      updated_at INTEGER, UNIQUE(board_id, user_id)
    );
    CREATE TABLE post (
      id TEXT PRIMARY KEY, board_id TEXT REFERENCES board(id),
      vote_count INTEGER NOT NULL DEFAULT 0 CHECK(vote_count >= 0)
    );
    CREATE TABLE vote (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES user(id),
      post_id TEXT REFERENCES post(id), board_id TEXT REFERENCES board(id),
      UNIQUE(board_id, user_id, post_id)
    );
    INSERT INTO user(id) VALUES ('actor'), ('victim');
    INSERT INTO board(id) VALUES ('board-a'), ('board-b');
    INSERT INTO post(id, board_id) VALUES ('post-a', 'board-a'), ('post-b', 'board-b');
  `);
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockPublish.mockResolvedValue(undefined);
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "actor",
    supabaseId: "supabase-actor",
    isGuest: false,
  });
  await client.executeMultiple(`
    DELETE FROM vote;
    DELETE FROM member;
    UPDATE post SET vote_count = 0;
    INSERT INTO member(id, user_id, board_id, role) VALUES ('membership', 'actor', 'board-a', 1);
    INSERT INTO vote(id, user_id, post_id, board_id) VALUES ('original', 'actor', 'post-a', 'board-a');
    UPDATE post SET vote_count = 1 WHERE id = 'post-a';
  `);
});

async function state() {
  return {
    votes: (
      await client.execute(
        "SELECT user_id, post_id, board_id FROM vote ORDER BY id"
      )
    ).rows,
    counts: (
      await client.execute("SELECT id, vote_count FROM post ORDER BY id")
    ).rows,
  };
}

describe.each(actions)("$name authorization", ({ name, run, count, event }) => {
  beforeEach(async () => {
    if (name === "upvote") {
      await client.execute("UPDATE vote SET user_id = 'victim'");
    }
  });

  it("ignores the client actor and publishes the session actor", async () => {
    if (name === "downvote") {
      await client.executeMultiple(`
        INSERT INTO vote(id, user_id, post_id, board_id) VALUES ('victim-vote', 'victim', 'post-a', 'board-a');
        UPDATE post SET vote_count = 2 WHERE id = 'post-a';
      `);
    }
    const expectedCount = name === "upvote" ? 2 : 1;
    await expect(run("post-a", "victim", "board-a")).resolves.toEqual({
      voteCount: expectedCount,
    });
    const rows = (
      await client.execute("SELECT user_id FROM vote ORDER BY user_id")
    ).rows;
    expect(rows.map((row) => row.user_id)).toEqual(
      name === "upvote" ? ["actor", "victim"] : ["victim"]
    );
    expect(
      (await client.execute("SELECT vote_count FROM post WHERE id = 'post-a'"))
        .rows[0].vote_count
    ).toBe(expectedCount);
    expect(mockChannel).toHaveBeenCalledWith("board-a");
    expect(mockPublish).toHaveBeenCalledWith({
      name: event,
      extras: { headers: { user: "actor" } },
      data: expect.any(String),
    });
    expect(JSON.parse(mockPublish.mock.calls[0][0].data)).toEqual({
      id: "post-a",
      operation: name,
      userId: "actor",
      timestamp: expect.any(Number),
    });
  });

  it.each([Role.owner, Role.member])("allows board role %s", async (role) => {
    await client.execute({ sql: "UPDATE member SET role = ?", args: [role] });
    await expect(run("post-a", "actor", "board-a")).resolves.toEqual({
      voteCount: count,
    });
  });

  it("preserves standard-link member access for an anonymous account", async () => {
    jest.mocked(verifySession).mockResolvedValue({
      isAuth: true,
      userId: "actor",
      supabaseId: "supabase-actor",
      isGuest: true,
    });
    await expect(run("post-a", "actor", "board-a")).resolves.toEqual({
      voteCount: count,
    });
  });

  it.each(["guest", "nonmember", "unauthenticated"])(
    "rejects a %s without writes or events",
    async (kind) => {
      if (kind === "guest") await client.execute("UPDATE member SET role = 2");
      if (kind === "nonmember") await client.execute("DELETE FROM member");
      if (kind === "unauthenticated")
        jest
          .mocked(verifySession)
          .mockRejectedValue(new Error("Unauthenticated"));
      const before = await state();
      await expect(run("post-a", "actor", "board-a")).rejects.toThrow();
      expect(await state()).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    }
  );

  it.each(["post-b", "missing-post"])(
    "rejects foreign or missing post %s without writes or events",
    async (postId) => {
      const before = await state();
      await expect(run(postId, "actor", "board-a")).rejects.toThrow();
      expect(await state()).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["", "board-a"],
    ["post-a", ""],
    [" ", "board-a"],
  ])("rejects invalid IDs %j / %j", async (postId, boardId) => {
    const before = await state();
    await expect(run(postId, "actor", boardId)).rejects.toThrow();
    expect(await state()).toEqual(before);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("uses parsed IDs for both authorization and writes", async () => {
    await expect(run(" post-a ", "actor", " board-a ")).resolves.toEqual({
      voteCount: count,
    });
    expect(mockChannel).toHaveBeenCalledWith("board-a");
    expect(JSON.parse(mockPublish.mock.calls[0][0].data).id).toBe("post-a");
  });

  it("rejects a repeated operation without another event", async () => {
    await run("post-a", "actor", "board-a");
    const before = await state();
    await expect(run("post-a", "actor", "board-a")).rejects.toThrow();
    expect(await state()).toEqual(before);
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  it("rolls back the vote when the count update fails", async () => {
    const before = await state();
    await client.executeMultiple(`
      CREATE TRIGGER reject_count BEFORE UPDATE OF vote_count ON post
      BEGIN SELECT RAISE(ABORT, 'forced count failure'); END;
    `);
    try {
      await expect(run("post-a", "actor", "board-a")).rejects.toThrow();
      expect(await state()).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    } finally {
      await client.execute("DROP TRIGGER reject_count");
    }
  });
});
