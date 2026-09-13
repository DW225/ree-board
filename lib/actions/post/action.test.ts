/// <reference types="jest" />
import { Role } from "@/lib/constants/role";
import { PostType } from "@/lib/constants/post";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db/client";
import {
  CreatePostAction,
  UpdatePostContentAction,
  MergePostsAction,
} from "./action";
import type * as Libsql from "@libsql/client";
import type * as Drizzle from "drizzle-orm/libsql";
import type * as Crypto from "node:crypto";
import type * as Fs from "node:fs";
import type * as Os from "node:os";
import type * as Path from "node:path";
jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    logAction: jest.fn(),
    warn: jest.fn(),
    logActionError: jest.fn(),
  },
}));
jest.mock("nanoid", () => ({
  nanoid: () => jest.requireActual<typeof Crypto>("node:crypto").randomUUID(),
}));
jest.mock("@/lib/db/client", () => {
  const { createClient } = jest.requireActual<typeof Libsql>("@libsql/client");
  const { drizzle } = jest.requireActual<typeof Drizzle>("drizzle-orm/libsql");
  const { mkdtempSync, rmSync } = jest.requireActual<typeof Fs>("node:fs");
  const { tmpdir } = jest.requireActual<typeof Os>("node:os");
  const { join } = jest.requireActual<typeof Path>("node:path");
  const directory = mkdtempSync(join(tmpdir(), "ree-board-post-"));
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
jest.mock("@/lib/utils/ably", () => ({
  ablyClient: () => ({ publish: mockPublish }),
  EVENT_TYPE: {
    POST: {
      ADD: "POST_ADD",
      UPDATE_CONTENT: "POST_UPDATE_CONTENT",
      MERGE: "POST_MERGE",
    },
  },
}));
const client = db.$client;
const newId = "abcdefghijklmnopqrstu";
const input = () => ({
  id: newId,
  boardId: "board-a",
  author: "victim",
  content: "  saved text  ",
  type: PostType.went_well,
  voteCount: 100,
  createdAt: new Date("2099-01-01"),
  updatedAt: new Date("2099-01-01"),
});
beforeAll(async () => {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT, email TEXT);
    CREATE TABLE board (id TEXT PRIMARY KEY);
    CREATE TABLE member (id TEXT PRIMARY KEY, user_id TEXT REFERENCES user(id),
      board_id TEXT REFERENCES board(id), role INTEGER NOT NULL, updated_at INTEGER);
    CREATE TABLE post (id TEXT PRIMARY KEY, board_id TEXT REFERENCES board(id), user_id TEXT REFERENCES user(id),
      content TEXT NOT NULL, post_type INTEGER NOT NULL, vote_count INTEGER DEFAULT 0 NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')) NOT NULL, updated_at INTEGER DEFAULT (strftime('%s','now')) NOT NULL);
    CREATE TABLE vote (id TEXT PRIMARY KEY, user_id TEXT REFERENCES user(id), board_id TEXT REFERENCES board(id),
      post_id TEXT REFERENCES post(id) ON DELETE CASCADE, UNIQUE(board_id, user_id, post_id));
    CREATE TABLE action (id TEXT PRIMARY KEY, post_id TEXT REFERENCES post(id) ON DELETE CASCADE);
    INSERT INTO user(id) VALUES ('actor'), ('victim');
    INSERT INTO board(id) VALUES ('board-a'), ('board-b');
  `);
});
beforeEach(async () => {
  jest.clearAllMocks();
  mockPublish.mockResolvedValue(undefined);
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "actor",
    supabaseId: "actor",
    isGuest: false,
  });
  await client.executeMultiple(`
    DELETE FROM vote; DELETE FROM action; DELETE FROM post; DELETE FROM member;
    INSERT INTO member(id,user_id,board_id,role) VALUES ('member','actor','board-a',1);
    INSERT INTO post(id,board_id,user_id,content,post_type) VALUES
      ('target','board-a','actor','target content',0), ('source','board-a','actor','source content',0),
      ('foreign','board-b','actor','foreign content',0);
  `);
});
const state = async () =>
  (await client.execute("SELECT * FROM post ORDER BY id")).rows;

it("creates one client-identified post with parsed content, session actor and server timestamps", async () => {
  const result = await CreatePostAction({ ...input(), boardId: " board-a " });
  expect(result).toMatchObject({
    id: newId,
    content: "saved text",
    author: "actor",
    voteCount: 0,
  });
  expect(Math.abs(result.createdAt.getTime() - Date.now())).toBeLessThan(5000);
  expect(Math.abs(result.updatedAt.getTime() - Date.now())).toBeLessThan(5000);
  expect(JSON.parse(mockPublish.mock.calls[0][0].data)).toEqual(
    JSON.parse(JSON.stringify(result))
  );
  expect((await state()).filter((row) => row.id === newId)).toHaveLength(1);
});
it.each([
  undefined,
  "",
  "x",
  "a".repeat(22),
  "a".repeat(20) + "/",
  newId + "\n",
])("rejects malformed new ID %s", async (id) => {
  await expect(
    CreatePostAction({ ...input(), id } as Parameters<
      typeof CreatePostAction
    >[0])
  ).rejects.toThrow();
  expect(mockPublish).not.toHaveBeenCalled();
  expect(await state()).toHaveLength(3);
});
it("rejects duplicate IDs without replacing content or emitting another event", async () => {
  await CreatePostAction(input());
  const before = await state();
  await expect(
    CreatePostAction({ ...input(), content: "replacement" })
  ).rejects.toThrow();
  expect(await state()).toEqual(before);
  expect(mockPublish).toHaveBeenCalledTimes(1);
});
it("uses parsed content and IDs on update", async () => {
  await UpdatePostContentAction(" target ", " board-a ", "  new content  ");
  expect((await state()).find((row) => row.id === "target")?.content).toBe(
    "new content"
  );
  expect(JSON.parse(mockPublish.mock.calls[0][0].data)).toEqual({
    id: "target",
    content: "new content",
  });
});
it.each(["target", "source"])(
  "rejects merge of another author's %s",
  async (id) => {
    await client.execute({
      sql: "UPDATE post SET user_id = 'victim' WHERE id = ?",
      args: [id],
    });
    const before = await state();
    await expect(
      MergePostsAction("target", ["source"], "merged", "board-a")
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
    expect(mockPublish).not.toHaveBeenCalled();
  }
);
it.each([Role.member, Role.owner])(
  "allows valid merge for role %s with parsed content",
  async (role) => {
    await client.execute({ sql: "UPDATE member SET role = ?", args: [role] });
    if (role === Role.owner)
      await client.execute("UPDATE post SET user_id = 'victim'");
    await client.executeMultiple(`INSERT INTO vote(id,user_id,board_id,post_id) VALUES
    ('v1','actor','board-a','target'), ('v2','actor','board-a','source'), ('v3','victim','board-a','source');`);
    const result = await MergePostsAction(
      " target ",
      [" source "],
      "  merged  ",
      " board-a "
    );
    expect(result.mergedPost.content).toBe("merged");
    expect(result.uniqueVoteCount).toBe(2);
    expect((await state()).map((row) => row.id)).toEqual(["foreign", "target"]);
  }
);
it.each(["foreign", "missing", "target"])(
  "rejects invalid merge source %s",
  async (source) => {
    const before = await state();
    await expect(
      MergePostsAction("target", [source], "merged", "board-a")
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
    expect(mockPublish).not.toHaveBeenCalled();
  }
);
it.each([Role.guest, null])(
  "denies create and merge for role %s",
  async (role) => {
    if (role === null) await client.execute("DELETE FROM member");
    else
      await client.execute({ sql: "UPDATE member SET role = ?", args: [role] });
    const before = await state();
    await expect(CreatePostAction(input())).rejects.toThrow();
    await expect(
      MergePostsAction("target", ["source"], "merged", "board-a")
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
    expect(mockPublish).not.toHaveBeenCalled();
  }
);
