import type * as TestDatabase from "@/tests/helpers/database";
import { Role } from "@/lib/constants/role";
import { verifySession } from "@/lib/dal";
import { db } from "@/lib/db/client";
import { checkMemberRole } from "@/lib/db/member";
import { bulkImportMembersAction, updateMemberRoleAction } from "./action";

jest.mock("@/lib/db/client", () =>
  jest
    .requireActual<typeof TestDatabase>("@/tests/helpers/database")
    .createTestDatabase()
);
jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({
  logger: { debug: jest.fn(), logAction: jest.fn() },
}));
jest.mock("@/lib/db/board", () => ({ fetchBoardsWhereUserIsAdmin: jest.fn() }));
jest.mock("@/lib/db/user", () => ({ findUserByEmail: jest.fn() }));
jest.mock("nanoid", () => ({ nanoid: () => crypto.randomUUID() }));

const client = db.$client;
const state = async () =>
  (await client.execute("SELECT * FROM member ORDER BY id")).rows;

beforeAll(async () => {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL);
    CREATE TABLE board (id TEXT PRIMARY KEY, title TEXT NOT NULL);
    CREATE TABLE member (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id),
      board_id TEXT NOT NULL REFERENCES board(id), role INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL DEFAULT 1,
      UNIQUE(board_id,user_id)
    );
    INSERT INTO user VALUES ('actor','Actor','actor@example.com'),
      ('alpha','Alpha','alpha@example.com'), ('beta','Beta','beta@example.com'),
      ('gamma','Gamma','gamma@example.com'), ('outsider','Outsider','outsider@example.com');
    INSERT INTO board VALUES ('source','Source'), ('target','Target');
  `);
});

beforeEach(async () => {
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "actor",
    supabaseId: "actor",
    isGuest: false,
  });
  await client.executeMultiple(`
    DELETE FROM member;
    INSERT INTO member(id,user_id,board_id,role) VALUES
      ('actor-source','actor','source',0), ('actor-target','actor','target',0),
      ('alpha-source','alpha','source',0), ('beta-source','beta','source',1),
      ('gamma-source','gamma','source',2), ('beta-target','beta','target',2);
  `);
});

it.each([Role.owner, Role.member, Role.guest])(
  "saves role %s only on the selected board",
  async (role) => {
    await expect(
      updateMemberRoleAction(" target ", " beta ", role)
    ).resolves.toEqual({
      id: "beta-target",
      userId: "beta",
      role,
    });
    expect(await checkMemberRole("beta", "target")).toBe(role);
    expect(await checkMemberRole("beta", "source")).toBe(Role.member);
  }
);

it("rejects demotion of the last owner without changing stored rows", async () => {
  const before = await state();
  await expect(
    updateMemberRoleAction("target", "actor", Role.guest)
  ).rejects.toThrow("at least one owner");
  expect(await state()).toEqual(before);
});

it("allows an owner to step down after another owner is assigned", async () => {
  await updateMemberRoleAction("target", "beta", Role.owner);
  await updateMemberRoleAction("target", "actor", Role.member);
  expect(await checkMemberRole("actor", "target")).toBe(Role.member);
  expect(await checkMemberRole("beta", "target")).toBe(Role.owner);
});

it("keeps an owner when two owner demotions run at the same time", async () => {
  await updateMemberRoleAction("target", "beta", Role.owner);
  const results = await Promise.allSettled([
    updateMemberRoleAction("target", "actor", Role.member),
    updateMemberRoleAction("target", "beta", Role.member),
  ]);
  expect(
    results.filter((result) => result.status === "fulfilled")
  ).toHaveLength(1);
  const owners = (await state()).filter(
    (row) => row.board_id === "target" && row.role === Role.owner
  );
  expect(owners).toHaveLength(1);
});

it("rejects a member from another board without changing stored rows", async () => {
  const before = await state();
  await expect(
    updateMemberRoleAction("target", "alpha", Role.owner)
  ).rejects.toThrow("Member not found");
  expect(await state()).toEqual(before);
});

it.each([Role.member, Role.guest, null])(
  "denies role edits by caller role %s",
  async (role) => {
    if (role === null) {
      await client.execute("DELETE FROM member WHERE id = 'actor-target'");
    } else {
      await client.execute({
        sql: "UPDATE member SET role = ? WHERE id = 'actor-target'",
        args: [role],
      });
    }
    const before = await state();
    await expect(
      updateMemberRoleAction("target", "beta", Role.owner)
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
  }
);

it.each([99, -1, "owner"])(
  "rejects invalid role %s without a write",
  async (role) => {
    const before = await state();
    await expect(
      updateMemberRoleAction("target", "beta", role as Role)
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
  }
);

it("imports all source roles and keeps the role of an existing target member", async () => {
  await client.execute("DELETE FROM member WHERE id = 'beta-target'");
  const result = await bulkImportMembersAction("target", "source", [
    "alpha",
    "beta",
    "gamma",
    "alpha",
  ]);
  expect(result).toMatchObject({ imported: 3, skipped: 0 });
  expect(await checkMemberRole("alpha", "target")).toBe(Role.owner);
  expect(await checkMemberRole("beta", "target")).toBe(Role.member);
  expect(await checkMemberRole("gamma", "target")).toBe(Role.guest);
  await updateMemberRoleAction("target", "beta", Role.guest);
  await expect(
    bulkImportMembersAction("target", "source", ["beta"])
  ).resolves.toEqual({ imported: 0, skipped: 1, members: [] });
  expect(await checkMemberRole("beta", "target")).toBe(Role.guest);
});

it("reads the current source role when the import is saved", async () => {
  await client.execute("UPDATE member SET role = 2 WHERE id = 'alpha-source'");
  const result = await bulkImportMembersAction("target", "source", ["alpha"]);
  expect(result.members).toEqual([
    { id: expect.any(String), userId: "alpha", role: Role.guest },
  ]);
  expect(await checkMemberRole("alpha", "target")).toBe(Role.guest);
});

it.each(["source", "target"])(
  "requires owner access to %s at import time",
  async (boardId) => {
    await client.execute({
      sql: "UPDATE member SET role = 1 WHERE user_id = 'actor' AND board_id = ?",
      args: [boardId],
    });
    const before = await state();
    await expect(
      bulkImportMembersAction("target", "source", ["alpha"])
    ).rejects.toThrow();
    expect(await state()).toEqual(before);
  }
);

it("rejects a selection that is absent from the source without a partial import", async () => {
  const before = await state();
  await expect(
    bulkImportMembersAction("target", "source", ["alpha", "outsider"])
  ).rejects.toThrow("no longer on the source board");
  expect(await state()).toEqual(before);
});

it("rejects client-supplied role grants in place of user IDs", async () => {
  const before = await state();
  await expect(
    bulkImportMembersAction("target", "source", [
      { userId: "gamma", role: Role.owner },
    ] as unknown as string[])
  ).rejects.toThrow();
  expect(await state()).toEqual(before);
});
