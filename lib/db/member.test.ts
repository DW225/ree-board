/// <reference types="jest" />
import type * as TestDatabase from "@/tests/helpers/database";
import { Role } from "@/lib/constants/role";
import { db } from "./client";
import { bulkAddMembers, checkMemberRole } from "./member";

jest.mock("./client", () =>
  jest
    .requireActual<typeof TestDatabase>("@/tests/helpers/database")
    .createTestDatabase()
);

const client = db.$client;
/** Reads stored rows in a stable order for before-and-after comparisons. */
const state = async () =>
  (await client.execute("SELECT * FROM member ORDER BY id")).rows;
beforeAll(async () => {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY);
    CREATE TABLE board (id TEXT PRIMARY KEY);
    CREATE TABLE member (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
      board_id TEXT NOT NULL REFERENCES board(id), role INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL DEFAULT 1,
      UNIQUE(board_id,user_id)
    );
    INSERT INTO user VALUES ('user-one'), ('user-two'), ('user-new');
    INSERT INTO board VALUES ('board-a'), ('board-b');
  `);
});
beforeEach(async () => {
  await client.executeMultiple(`
    DELETE FROM member;
    INSERT INTO member(id,user_id,board_id,role) VALUES
      ('one-a','user-one','board-a',0),
      ('two-a','user-two','board-a',1),
      ('one-b','user-one','board-b',2);
  `);
});

it.each([
  { user: "user-one", board: "board-a", role: Role.owner },
  { user: "user-two", board: "board-a", role: Role.member },
  { user: "user-one", board: "board-b", role: Role.guest },
  { user: "user-two", board: "board-b", role: null },
  { user: "user-new", board: "board-a", role: null },
  { user: "user-one", board: "missing-board", role: null },
])(
  "returns the stored role for $user in $board",
  async ({ user, board, role }) => {
    await expect(checkMemberRole(user, board)).resolves.toBe(role);
  }
);

it.each([false, true])(
  "returns only inserted members with transaction=%s",
  async (inTransaction) => {
    const before = await state();
    const members = [
      {
        id: "saved",
        userId: "user-new",
        boardId: "board-a",
        role: Role.member,
      },
      {
        id: "skipped",
        userId: "user-one",
        boardId: "board-a",
        role: Role.guest,
      },
    ];
    const result = inTransaction
      ? await db.transaction((tx) => bulkAddMembers(members, tx))
      : await bulkAddMembers(members);
    expect(result).toEqual([
      { id: "saved", userId: "user-new", role: Role.member },
    ]);
    const after = await state();
    expect(after.filter((row) => row.id !== "saved")).toEqual(before);
    expect(after.find((row) => row.id === "saved")).toMatchObject({
      user_id: "user-new",
      board_id: "board-a",
      role: Role.member,
    });
  }
);

it("returns an empty list without inserting an empty batch", async () => {
  const before = await state();
  await expect(bulkAddMembers([])).resolves.toEqual([]);
  expect(await state()).toEqual(before);
});
