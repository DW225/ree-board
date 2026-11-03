import { boardTable, memberTable, userTable } from "@/db/schema";
import { BoardState } from "@/lib/constants/board";
import { Role } from "@/lib/constants/role";
import { verifySession } from "@/lib/dal";
import { fetchBoards, fetchBoardsWhereUserIsAdmin } from "@/lib/db/board";
import { db } from "@/lib/db/client";
import type * as TestDatabase from "@/tests/helpers/database";
import { eq, inArray } from "drizzle-orm";
import { createBoardAction, updateBoardAction } from "./action";

jest.mock("@/lib/db/client", () =>
  jest
    .requireActual<typeof TestDatabase>("@/tests/helpers/database")
    .createTestDatabase()
);
jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({ logger: { debug: jest.fn() } }));
jest.mock("nanoid", () => ({ nanoid: () => crypto.randomUUID() }));

const boardId = "board-settings-test01";
const otherBoardId = "board-settings-test02";
const createdBoardId = "board-settings-test03";
const details = {
  title: "Updated board",
  description: "Sprint notes\nNext steps",
  visibility: "private" as const,
};
const state = () => db.select().from(boardTable).orderBy(boardTable.id);

beforeAll(async () => {
  await db.$client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
      supabase_id TEXT NOT NULL UNIQUE, is_guest INTEGER, guest_expires_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE board (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      visibility TEXT NOT NULL, state INTEGER NOT NULL,
      team_id TEXT,
      user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE member (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      board_id TEXT NOT NULL REFERENCES board(id) ON DELETE CASCADE, role INTEGER NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(board_id, user_id)
    );
  `);
  await db.insert(userTable).values({
    id: "owner",
    name: "Owner",
    email: "owner@example.invalid",
    supabase_id: "owner",
  });
});

beforeEach(async () => {
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "owner",
    supabaseId: "owner",
    isGuest: false,
  });
  await db
    .delete(memberTable)
    .where(
      inArray(memberTable.boardId, [boardId, otherBoardId, createdBoardId])
    );
  await db
    .delete(boardTable)
    .where(inArray(boardTable.id, [boardId, otherBoardId, createdBoardId]));
  await createBoardAction(
    { id: boardId, title: "Original board", state: BoardState.active },
    []
  );
  await createBoardAction(
    { id: otherBoardId, title: "Other board", state: BoardState.active },
    []
  );
});

it("gives new boards empty descriptions and private visibility", async () => {
  expect(await fetchBoards("owner")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: boardId,
        description: null,
        visibility: "private",
        teamId: null,
      }),
    ])
  );
});

it("persists an explicit team choice without changing membership", async () => {
  const id = createdBoardId;
  await createBoardAction(
    { id, title: "Team board", state: BoardState.active, visibility: "team" },
    []
  );
  expect(
    (await fetchBoards("owner")).find((board) => board.id === id)
  ).toMatchObject({ visibility: "team" });
  expect(await fetchBoards("non-member")).toEqual([]);
  expect(
    await db.select().from(memberTable).where(eq(memberTable.boardId, id))
  ).toEqual([expect.objectContaining({ userId: "owner", role: Role.owner })]);
});

it.each(["public", null])(
  "rejects invalid visibility on creation: %j",
  async (visibility) => {
    const before = await state();
    await expect(
      createBoardAction(
        {
          id: createdBoardId,
          title: "Invalid visibility",
          state: BoardState.active,
          visibility: visibility as unknown as "private",
        },
        []
      )
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
  }
);

it("saves and reads all settings on only the selected board", async () => {
  const otherBefore = (await state()).find(
    (board) => board.id === otherBoardId
  );
  const saved = await updateBoardAction(boardId, details);
  expect(saved).toMatchObject({ id: boardId, ...details });
  for (const boards of [
    await fetchBoards("owner"),
    await fetchBoardsWhereUserIsAdmin("owner"),
  ]) {
    expect(boards.find((board) => board.id === boardId)).toMatchObject(details);
  }
  expect((await state()).find((board) => board.id === otherBoardId)).toEqual(
    otherBefore
  );
});

it("saves description-only and visibility-only changes and clears descriptions", async () => {
  await updateBoardAction(boardId, {
    title: "Original board",
    description: "Notes",
    visibility: "team",
  });
  expect(
    (await fetchBoards("owner")).find((board) => board.id === boardId)
  ).toMatchObject({ description: "Notes", visibility: "team" });
  await updateBoardAction(boardId, {
    title: "Original board",
    description: "Notes",
    visibility: "private",
  });
  expect(
    (await fetchBoards("owner")).find((board) => board.id === boardId)
  ).toMatchObject({ description: "Notes", visibility: "private" });
  await updateBoardAction(boardId, {
    title: "Original board",
    description: "  ",
    visibility: "private",
  });
  expect(
    (await fetchBoards("owner")).find((board) => board.id === boardId)
  ).toMatchObject({ description: null, visibility: "private" });
});

it.each([Role.member, Role.guest, null])(
  "rejects changes from role %s without changing a board",
  async (role) => {
    if (role === null)
      await db.delete(memberTable).where(eq(memberTable.boardId, boardId));
    else
      await db
        .update(memberTable)
        .set({ role })
        .where(eq(memberTable.boardId, boardId));
    const before = await state();
    await expect(updateBoardAction(boardId, details)).rejects.toThrow();
    expect(await state()).toEqual(before);
  }
);

it("rejects an unauthenticated caller without changing a board", async () => {
  jest
    .mocked(verifySession)
    .mockRejectedValueOnce(new Error("Unauthenticated"));
  const before = await state();
  await expect(updateBoardAction(boardId, details)).rejects.toThrow(
    "Unauthenticated"
  );
  expect(await state()).toEqual(before);
});

it.each([
  { ...details, title: "   " },
  { ...details, title: "x".repeat(101) },
  { ...details, description: 42 },
  { ...details, visibility: "public" },
  { ...details, visibility: null },
])("rejects malformed settings without a partial write: %j", async (input) => {
  const before = await state();
  await expect(
    updateBoardAction(
      boardId,
      input as unknown as Parameters<typeof updateBoardAction>[1]
    )
  ).rejects.toThrow();
  expect(await state()).toEqual(before);
});

it("strips fields outside board settings", async () => {
  const input = {
    ...details,
    creator: "attacker",
    state: 99,
    id: otherBoardId,
  };
  await updateBoardAction(boardId, input);
  expect((await state()).find((board) => board.id === boardId)).toMatchObject({
    ...details,
    creator: "owner",
    state: BoardState.active,
  });
});
