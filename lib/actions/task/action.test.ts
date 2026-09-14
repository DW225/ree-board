/// <reference types="jest" />
import { Role } from "@/lib/constants/role";
import { TaskState } from "@/lib/constants/task";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db/client";
import {
  authedCreateAction,
  authedPostAssign,
  authedPostActionStateUpdate,
} from "./action";
import type * as Fs from "node:fs";
import type * as Os from "node:os";
import type * as Path from "node:path";
import type * as Libsql from "@libsql/client";
import type * as Drizzle from "drizzle-orm/libsql";

jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({
  logger: { debug: jest.fn(), logAction: jest.fn() },
}));
jest.mock("nanoid", () => ({ nanoid: () => "unused" }));
jest.mock("@/lib/db/client", () => {
  const { createClient } = jest.requireActual<typeof Libsql>("@libsql/client");
  const { drizzle } = jest.requireActual<typeof Drizzle>("drizzle-orm/libsql");
  const { mkdtempSync, rmSync } = jest.requireActual<typeof Fs>("node:fs");
  const { tmpdir } = jest.requireActual<typeof Os>("node:os");
  const { join } = jest.requireActual<typeof Path>("node:path");
  const directory = mkdtempSync(join(tmpdir(), "ree-task-"));
  const client = createClient({ url: `file:${join(directory, "test.db")}` });
  afterAll(() => {
    client.close();
    rmSync(directory, { recursive: true, force: true });
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
  EVENT_TYPE: {
    ACTION: {
      CREATE: "ACTION_CREATE",
      ASSIGN: "ACTION_ASSIGN",
      STATE_UPDATE: "ACTION_STATE_UPDATE",
    },
  },
}));

const client = db.$client;
const operations = [
  {
    name: "assignment",
    event: "ACTION_ASSIGN",
    column: "user_id",
    value: "assignee",
    run: (postId: string, boardId: string) =>
      authedPostAssign({ postId, boardId, userId: "assignee" }),
  },
  {
    name: "state",
    event: "ACTION_STATE_UPDATE",
    column: "state",
    value: TaskState.completed,
    run: (postId: string, boardId: string) =>
      authedPostActionStateUpdate({
        postId,
        boardId,
        state: TaskState.completed,
      }),
  },
];

beforeAll(async () => {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT, email TEXT);
    CREATE TABLE board (id TEXT PRIMARY KEY);
    CREATE TABLE member (id TEXT PRIMARY KEY, user_id TEXT REFERENCES user(id),
      board_id TEXT REFERENCES board(id), role INTEGER NOT NULL, updated_at INTEGER);
    CREATE TABLE post (id TEXT PRIMARY KEY, board_id TEXT REFERENCES board(id));
    CREATE TABLE action (id TEXT PRIMARY KEY, post_id TEXT REFERENCES post(id),
      board_id TEXT REFERENCES board(id), user_id TEXT REFERENCES user(id),
      state INTEGER NOT NULL DEFAULT 0, created_at INTEGER, updated_at INTEGER);
    INSERT INTO user(id) VALUES ('actor'), ('assignee');
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
    supabaseId: "actor",
    isGuest: false,
  });
  await client.executeMultiple(`
    DELETE FROM member;
    DELETE FROM action;
    INSERT INTO member(id, user_id, board_id, role) VALUES ('member-a', 'actor', 'board-a', 1);
    INSERT INTO action(id, post_id, board_id) VALUES ('task-a', 'post-a', 'board-a'), ('task-b', 'post-b', 'board-b');
  `);
});

const state = async () =>
  (await client.execute("SELECT * FROM action ORDER BY id")).rows;

describe.each(operations)("task $name", ({ run, column, value, event }) => {
  it.each([Role.owner, Role.member])(
    "saves before publishing for role %s",
    async (role) => {
      await client.execute({ sql: "UPDATE member SET role = ?", args: [role] });
      mockPublish.mockImplementation(async () => {
        expect((await state())[0][column]).toBe(value);
      });
      await run("post-a", "board-a");
      expect(mockChannel).toHaveBeenCalledWith("board-a");
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({ name: event })
      );
      expect((await state())[1]).toMatchObject({ user_id: null, state: 0 });
    }
  );

  it("allows an anonymous account with board member access", async () => {
    jest.mocked(verifySession).mockResolvedValue({
      isAuth: true,
      userId: "actor",
      supabaseId: "actor",
      isGuest: true,
    });
    await run("post-a", "board-a");
    expect((await state())[0][column]).toBe(value);
  });

  it.each([
    "guest",
    "nonmember",
    "unauthenticated",
    "foreign",
    "missing",
    "wrong-task-board",
    "wrong-post-board",
  ])("rejects %s without writes or events", async (kind) => {
    if (kind === "guest") await client.execute("UPDATE member SET role = 2");
    if (kind === "nonmember") await client.execute("DELETE FROM member");
    if (kind === "unauthenticated")
      jest
        .mocked(verifySession)
        .mockRejectedValue(new Error("Unauthenticated"));
    if (kind === "wrong-task-board")
      await client.execute(
        "UPDATE action SET board_id = 'board-b' WHERE id = 'task-a'"
      );
    if (kind === "wrong-post-board")
      await client.execute(
        "UPDATE post SET board_id = 'board-b' WHERE id = 'post-a'"
      );
    const before = await state();
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    try {
      const postId =
        kind === "foreign"
          ? "post-b"
          : kind === "missing"
            ? "missing"
            : "post-a";
      await expect(run(postId, "board-a")).rejects.toThrow();
      expect(await state()).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await client.execute(
        "UPDATE post SET board_id = 'board-a' WHERE id = 'post-a'"
      );
    }
  });

  it("uses parsed IDs in the write and event", async () => {
    await run(" post-a ", " board-a ");
    expect((await state())[0][column]).toBe(value);
    expect(mockChannel).toHaveBeenCalledWith("board-a");
    expect(JSON.parse(mockPublish.mock.calls[0][0].data)).toMatchObject({
      postId: "post-a",
      boardId: "board-a",
    });
  });

  it("does not publish when the database rejects the update", async () => {
    const before = await state();
    await client.executeMultiple(
      "CREATE TRIGGER reject_update BEFORE UPDATE ON action BEGIN SELECT RAISE(ABORT, 'forced failure'); END;"
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    try {
      await expect(run("post-a", "board-a")).rejects.toThrow();
      expect(await state()).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await client.execute("DROP TRIGGER reject_update");
    }
  });
});

it("allows removing an assignment", async () => {
  await client.execute(
    "UPDATE action SET user_id = 'assignee' WHERE id = 'task-a'"
  );
  await authedPostAssign({
    postId: "post-a",
    boardId: "board-a",
    userId: null,
  });
  expect((await state())[0].user_id).toBeNull();
});

it.each([
  { postId: "", boardId: "board-a", state: TaskState.completed },
  { postId: "post-a", boardId: "board-a", state: 99 as TaskState },
])("rejects invalid state input %j", async (input) => {
  const before = await state();
  await expect(authedPostActionStateUpdate(input)).rejects.toThrow();
  expect(await state()).toEqual(before);
  expect(mockPublish).not.toHaveBeenCalled();
});

it("rejects an empty assignee", async () => {
  const before = await state();
  await expect(
    authedPostAssign({ postId: "post-a", boardId: "board-a", userId: " " })
  ).rejects.toThrow();
  expect(await state()).toEqual(before);
  expect(mockPublish).not.toHaveBeenCalled();
});

describe("task creation", () => {
  const input = { id: "task-new", postId: "post-a", boardId: "board-a" };
  it.each([
    "foreign",
    "missing",
    "guest",
    "invalid-state",
    "invalid-id",
    "failed-write",
  ])("rejects %s without an event", async (kind) => {
    const value = { ...input };
    if (kind === "foreign") value.postId = "post-b";
    if (kind === "missing") value.postId = "missing";
    if (kind === "guest") await client.execute("UPDATE member SET role = 2");
    if (kind === "invalid-id") value.id = " ";
    if (kind === "failed-write") value.id = "task-a";
    const before = await state();
    await expect(
      authedCreateAction({
        ...value,
        ...(kind === "invalid-state" ? { state: 99 as TaskState } : {}),
      })
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("publishes parsed, saved data with server timestamps after the write", async () => {
    const before = Date.now() - 1000;
    mockPublish.mockImplementation(async () => {
      expect((await state()).find((row) => row.id === input.id)).toBeDefined();
    });
    await authedCreateAction({
      ...input,
      id: " task-new ",
      postId: " post-a ",
      boardId: " board-a ",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    const event = JSON.parse(mockPublish.mock.calls[0][0].data);
    expect(event).toMatchObject({
      ...input,
      userId: null,
      state: TaskState.pending,
    });
    expect(Date.parse(event.createdAt)).toBeGreaterThanOrEqual(before);
    const saved = (await state()).find((row) => row.id === input.id);
    expect(saved?.created_at).toBe(
      Math.floor(Date.parse(event.createdAt) / 1000)
    );
  });
});
