/// <reference types="jest" />
import type * as TestDatabase from "@/tests/helpers/database";
import { Role } from "@/lib/constants/role";
import { TaskState } from "@/lib/constants/task";
import { PostType } from "@/lib/constants/post";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db/client";
import {
  processPostMessage,
  processTaskMessage,
} from "@/lib/realtime/messageProcessors";
import { initializePostSignals, tasksSignal } from "@/lib/signal/postSignals";
import {
  CreatePostAction,
  UpdatePostTypeAction,
} from "@/lib/actions/post/action";
import type * as Crypto from "node:crypto";
import {
  authedCreateAction,
  authedPostAssign,
  authedPostActionStateUpdate,
} from "./action";

jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({
  logger: { debug: jest.fn(), logAction: jest.fn(), warn: jest.fn() },
}));
jest.mock("nanoid", () => ({
  nanoid: () => jest.requireActual<typeof Crypto>("node:crypto").randomUUID(),
}));
jest.mock("@/lib/db/client", () =>
  jest
    .requireActual<typeof TestDatabase>("@/tests/helpers/database")
    .createTestDatabase()
);

const mockPublish = jest.fn();
const mockChannel = jest.fn<{ publish: typeof mockPublish }, [string]>(() => ({
  publish: mockPublish,
}));
jest.mock("@/lib/utils/ably", () => ({
  ablyClient: (boardId: string) => mockChannel(boardId),
  EVENT_TYPE: {
    POST: { ADD: "POST_ADD", UPDATE_TYPE: "POST_UPDATE_TYPE" },
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
    CREATE TABLE post (id TEXT PRIMARY KEY, board_id TEXT REFERENCES board(id),
      user_id TEXT REFERENCES user(id), content TEXT NOT NULL DEFAULT 'text',
      post_type INTEGER NOT NULL DEFAULT 0, vote_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE action (id TEXT PRIMARY KEY, post_id TEXT REFERENCES post(id),
      board_id TEXT REFERENCES board(id), user_id TEXT REFERENCES user(id),
      state INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')));
    INSERT INTO user(id) VALUES ('actor'), ('assignee');
    INSERT INTO board(id) VALUES ('board-a'), ('board-b');
    INSERT INTO post(id, board_id) VALUES ('post-a', 'board-a'), ('post-b', 'board-b');
  `);
});

beforeEach(async () => {
  jest.clearAllMocks();
  initializePostSignals([], []);
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
    DELETE FROM post WHERE id NOT IN ('post-a', 'post-b');
    UPDATE post SET post_type = 0, user_id = 'actor';
    INSERT INTO member(id, user_id, board_id, role) VALUES ('member-a', 'actor', 'board-a', 1);
    INSERT INTO action(id, post_id, board_id) VALUES ('task-a', 'post-a', 'board-a'), ('task-b', 'post-b', 'board-b');
  `);
});

const state = async () =>
  (await client.execute("SELECT * FROM action ORDER BY id")).rows;

describe.each(operations)("task $name", ({ run, column, value, event }) => {
  it("works as soon as a new action item is published", async () => {
    const id = "abcdefghijklmnopqrstu";
    mockPublish.mockImplementation(
      async (message: { name: string; data: string }) => {
        if (message.name === "POST_ADD") {
          processPostMessage(message.name, JSON.parse(message.data), "viewer");
          await run(id, "board-a");
        } else {
          processTaskMessage(message.name, JSON.parse(message.data));
        }
      }
    );
    await CreatePostAction({
      id,
      boardId: "board-a",
      content: "Action",
      type: PostType.action_item,
    });
    expect((await state()).filter((row) => row.post_id === id)).toEqual([
      expect.objectContaining({ board_id: "board-a", [column]: value }),
    ]);
    const savedTask = (await state()).find((row) => row.post_id === id);
    expect(tasksSignal.value[id]).toMatchObject({
      id: savedTask?.id,
      [column === "user_id" ? "userId" : "state"]: value,
    });
  });

  it("repairs a missing task and keeps subsequent updates in one row", async () => {
    await client.executeMultiple(`
      DELETE FROM action WHERE post_id = 'post-a';
      UPDATE post SET post_type = 3 WHERE id = 'post-a';
    `);
    await run("post-a", "board-a");
    await authedPostAssign({
      postId: "post-a",
      boardId: "board-a",
      userId: "assignee",
    });
    await authedPostActionStateUpdate({
      postId: "post-a",
      boardId: "board-a",
      state: TaskState.completed,
    });
    expect((await state()).filter((row) => row.post_id === "post-a")).toEqual([
      expect.objectContaining({
        user_id: "assignee",
        state: TaskState.completed,
      }),
    ]);
  });

  it("does not create a task for an ordinary post", async () => {
    await client.execute("DELETE FROM action WHERE post_id = 'post-a'");
    const before = await state();
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    try {
      await expect(run("post-a", "board-a")).rejects.toThrow("Task not found");
      expect(await state()).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

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
    await client.execute("UPDATE post SET post_type = 3");
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
  beforeEach(async () => {
    await client.execute("DELETE FROM action WHERE post_id = 'post-a'");
  });
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
    if (kind === "failed-write") value.id = "task-b";
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

it("creates a task on conversion and preserves it on re-entry", async () => {
  await client.execute("DELETE FROM action WHERE post_id = 'post-a'");
  mockPublish.mockImplementation(
    async (message: { name: string; data: string }) => {
      if (message.name.startsWith("ACTION_")) {
        processTaskMessage(message.name, JSON.parse(message.data));
      }
    }
  );
  await UpdatePostTypeAction("post-a", "board-a", PostType.action_item);
  const rows = (await state()).filter((row) => row.post_id === "post-a");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ user_id: null, state: TaskState.pending });
  expect(tasksSignal.value["post-a"]).toMatchObject({
    id: rows[0].id,
    state: TaskState.pending,
  });
  await authedPostAssign({
    postId: "post-a",
    boardId: "board-a",
    userId: "assignee",
  });
  await authedPostActionStateUpdate({
    postId: "post-a",
    boardId: "board-a",
    state: TaskState.completed,
  });
  const saved = await state();
  const savedSignal = tasksSignal.value["post-a"];
  await UpdatePostTypeAction("post-a", "board-a", PostType.to_discuss);
  await UpdatePostTypeAction("post-a", "board-a", PostType.action_item);
  expect(await state()).toEqual(saved);
  expect(tasksSignal.value["post-a"]).toEqual(savedSignal);
});

it.each(["create", "convert"])(
  "rolls back %s if task creation fails",
  async (kind) => {
    await client.execute("DELETE FROM action WHERE post_id = 'post-a'");
    const before = (await client.execute("SELECT * FROM post ORDER BY id"))
      .rows;
    await client.executeMultiple(
      "CREATE TRIGGER reject_insert BEFORE INSERT ON action BEGIN SELECT RAISE(ABORT, 'forced failure'); END;"
    );
    try {
      const operation =
        kind === "create"
          ? CreatePostAction({
              id: "abcdefghijklmnopqrstu",
              boardId: "board-a",
              content: "Action",
              type: PostType.action_item,
            })
          : UpdatePostTypeAction("post-a", "board-a", PostType.action_item);
      await expect(operation).rejects.toThrow();
      expect(
        (await client.execute("SELECT * FROM post ORDER BY id")).rows
      ).toEqual(before);
      expect(mockPublish).not.toHaveBeenCalled();
    } finally {
      await client.execute("DROP TRIGGER reject_insert");
    }
  }
);

it("does not duplicate or reset a task when an older client requests creation again", async () => {
  await client.execute(
    "UPDATE action SET user_id = 'assignee', state = 2 WHERE id = 'task-a'"
  );
  const before = await state();
  await authedCreateAction({
    id: "old-client-task",
    postId: "post-a",
    boardId: "board-a",
  });
  expect(await state()).toEqual(before);
  expect(mockPublish).not.toHaveBeenCalled();
});
