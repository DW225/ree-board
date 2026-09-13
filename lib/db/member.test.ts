/// <reference types="jest" />
// Must mock all dependencies before module imports (jest.mock is hoisted)
jest.mock("@/db/schema", () => ({
  boardTable: {},
  memberTable: {},
  userTable: {},
}));

jest.mock("drizzle-orm", () => ({
  and: jest.fn(() => ({})),
  eq: jest.fn(() => ({})),
  sql: { placeholder: jest.fn(() => "?") },
  count: jest.fn(() => ({})),
  inArray: jest.fn(() => ({})),
  ne: jest.fn(() => ({})),
  notExists: jest.fn(() => ({})),
}));

// Build a chainable mock DB that satisfies module-level prepared statement creation
jest.mock("./client", () => {
  const chain: Record<string, jest.Mock> = {
    from: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    prepare: jest.fn().mockReturnValue({ execute: jest.fn() }),
    values: jest.fn(),
    onConflictDoNothing: jest.fn(),
    set: jest.fn(),
    returning: jest.fn(),
    as: jest.fn(),
    selectDistinct: jest.fn(),
    orderBy: jest.fn(),
  };

  // Make every method except prepare() return the chain itself
  for (const key of Object.keys(chain)) {
    if (key !== "prepare") {
      chain[key].mockReturnValue(chain);
    }
  }

  return {
    db: {
      select: jest.fn(() => chain),
      insert: jest.fn(() => chain),
      delete: jest.fn(() => chain),
      update: jest.fn(() => chain),
      selectDistinct: jest.fn(() => chain),
      transaction: jest.fn(),
    },
    withDbRetry: jest.fn(),
  };
});

import { Role } from "@/lib/constants/role";
import type { Transaction } from "@/lib/types/db";
import { db, withDbRetry } from "./client";
import { bulkAddMembers, checkMemberRole } from "./member";

const mockWithDbRetry = withDbRetry as jest.Mock;

it.each([false, true])(
  "returns only inserted members with transaction=%s",
  async (inTransaction) => {
    const returning = jest
      .fn()
      .mockResolvedValue([{ id: "saved", userId: "added", role: Role.member }]);
    const insert = jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing: jest.fn(() => ({ returning })),
      })),
    }));
    if (!inTransaction) (db.insert as jest.Mock).mockImplementationOnce(insert);
    const result = await bulkAddMembers(
      [
        { id: "saved", userId: "added", boardId: "board", role: Role.member },
        {
          id: "skipped",
          userId: "existing",
          boardId: "board",
          role: Role.guest,
        },
      ],
      inTransaction ? ({ insert } as unknown as Transaction) : undefined
    );
    expect(result).toEqual([
      { id: "saved", userId: "added", role: Role.member },
    ]);
  }
);

it("returns an empty list without inserting an empty batch", async () => {
  jest.clearAllMocks();
  await expect(bulkAddMembers([])).resolves.toEqual([]);
  expect(db.insert).not.toHaveBeenCalled();
});

describe("checkMemberRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns role when user is a board member", async () => {
    mockWithDbRetry.mockResolvedValue([{ role: "member" }]);

    const result = await checkMemberRole("user-1", "board-1");

    expect(result).toBe("member");
  });

  it("returns owner role when user is the board owner", async () => {
    mockWithDbRetry.mockResolvedValue([{ role: "owner" }]);

    const result = await checkMemberRole("user-1", "board-1");

    expect(result).toBe("owner");
  });

  it("returns null when user is NOT a board member (empty array result)", async () => {
    mockWithDbRetry.mockResolvedValue([]);

    const result = await checkMemberRole("user-99", "board-1");

    expect(result).toBeNull();
  });

  it("returns null for non-existent board", async () => {
    mockWithDbRetry.mockResolvedValue([]);

    const result = await checkMemberRole("user-1", "nonexistent-board");

    expect(result).toBeNull();
  });
});
