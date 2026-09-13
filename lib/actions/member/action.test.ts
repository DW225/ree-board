/// <reference types="jest" />
import { Role } from "@/lib/constants/role";
import { verifySession } from "@/lib/dal";
import {
  addMember,
  bulkAddMembers,
  checkMemberRole,
  fetchMembersWithExclude,
} from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import {
  addMemberToBoardAction,
  bulkImportMembersAction,
  findUserByEmailAction,
  getMembersFromBoardWithExclusionAction,
} from "./action";

jest.mock("@/lib/dal", () => ({ verifySession: jest.fn() }));
jest.mock("@/lib/utils/logger", () => ({
  logger: { debug: jest.fn(), logAction: jest.fn() },
}));
jest.mock("nanoid", () => ({ nanoid: () => "new-member" }));
jest.mock("@/lib/db/board", () => ({ fetchBoardsWhereUserIsAdmin: jest.fn() }));
jest.mock("@/lib/db/client", () => ({
  db: {
    transaction: async (callback: (trx: unknown) => Promise<unknown>) =>
      callback({}),
  },
}));
jest.mock("@/lib/db/user", () => ({ findUserByEmail: jest.fn() }));
jest.mock("@/lib/db/member", () => ({
  addMember: jest.fn(),
  bulkAddMembers: jest.fn(),
  checkMemberRole: jest.fn(),
  fetchMembersByBoardID: jest.fn(async () => []),
  fetchMembersWithExclude: jest.fn(async () => []),
  removeMember: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "actor",
    supabaseId: "actor",
    isGuest: false,
  });
  jest.mocked(checkMemberRole).mockResolvedValue(Role.owner);
});

it.each([Role.owner, 99 as Role])(
  "rejects member role %s in individual and bulk grants",
  async (role) => {
    await expect(
      addMemberToBoardAction({
        id: "id",
        userId: "user",
        boardId: "board",
        role,
      })
    ).rejects.toThrow();
    await expect(
      bulkImportMembersAction("board", [{ userId: "user", role }])
    ).rejects.toThrow();
    expect(addMember).not.toHaveBeenCalled();
    expect(bulkAddMembers).not.toHaveBeenCalled();
  }
);

it.each([Role.member, Role.guest, null])(
  "denies member management to role %s",
  async (role) => {
    jest.mocked(checkMemberRole).mockResolvedValue(role);
    await expect(
      addMemberToBoardAction({
        id: "id",
        userId: "user",
        boardId: "board",
        role: Role.member,
      })
    ).rejects.toThrow();
    await expect(
      bulkImportMembersAction("board", [{ userId: "user", role: Role.member }])
    ).rejects.toThrow();
    expect(addMember).not.toHaveBeenCalled();
    expect(bulkAddMembers).not.toHaveBeenCalled();
  }
);

it.each([Role.member, Role.guest])(
  "uses parsed values for allowed role %s",
  async (role) => {
    await addMemberToBoardAction({
      id: " id ",
      userId: " user ",
      boardId: " board ",
      role,
    });
    expect(addMember).toHaveBeenCalledWith({
      id: "id",
      userId: "user",
      boardId: "board",
      role,
    });
    await bulkImportMembersAction(" board ", [{ userId: " user ", role }]);
    expect(bulkAddMembers).toHaveBeenCalledWith(
      [{ id: "new-member", userId: "user", boardId: "board", role }],
      expect.anything()
    );
  }
);

it("rejects empty grant IDs", async () => {
  await expect(
    addMemberToBoardAction({
      id: " ",
      userId: "user",
      boardId: "board",
      role: Role.member,
    })
  ).rejects.toThrow();
  await expect(
    bulkImportMembersAction("board", [{ userId: " ", role: Role.member }])
  ).rejects.toThrow();
  expect(addMember).not.toHaveBeenCalled();
  expect(bulkAddMembers).not.toHaveBeenCalled();
});

it.each(["source", "target"])(
  "requires owner access to the %s board before import lookup",
  async (boardId) => {
    jest
      .mocked(checkMemberRole)
      .mockImplementation(async (_user, board) =>
        board === boardId ? Role.guest : Role.owner
      );
    await expect(
      getMembersFromBoardWithExclusionAction("source", "target")
    ).rejects.toThrow();
    expect(fetchMembersWithExclude).not.toHaveBeenCalled();
  }
);

it("uses both parsed board IDs for import lookup", async () => {
  await getMembersFromBoardWithExclusionAction(" source ", " target ");
  expect(checkMemberRole).toHaveBeenCalledWith("actor", "source");
  expect(checkMemberRole).toHaveBeenCalledWith("actor", "target");
  expect(fetchMembersWithExclude).toHaveBeenCalledWith(["source"], "target");
});

it("denies email lookup without board ownership", async () => {
  jest.mocked(checkMemberRole).mockResolvedValue(Role.member);
  await expect(
    findUserByEmailAction("user@example.com", "board")
  ).rejects.toThrow();
  expect(findUserByEmail).not.toHaveBeenCalled();
});

it("normalizes an invite email and returns only needed profile fields", async () => {
  jest.mocked(findUserByEmail).mockResolvedValue({
    id: "user",
    name: "User",
    email: "user@example.com",
    supabaseUid: "private",
  } as Awaited<ReturnType<typeof findUserByEmail>>);
  await expect(
    findUserByEmailAction(" USER@example.com ", " board ")
  ).resolves.toEqual({ id: "user", name: "User" });
  expect(findUserByEmail).toHaveBeenCalledWith("user@example.com");
});

it("rejects an invalid invite email before lookup", async () => {
  await expect(findUserByEmailAction("invalid", "board")).rejects.toThrow();
  expect(findUserByEmail).not.toHaveBeenCalled();
});

it("does not forward caller timestamps in member grants", async () => {
  await addMemberToBoardAction({
    id: "id",
    userId: "user",
    boardId: "board",
    role: Role.member,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
  expect(addMember).toHaveBeenCalledWith({
    id: "id",
    userId: "user",
    boardId: "board",
    role: Role.member,
  });
});

it("imports each user once and retains the first requested role", async () => {
  const result = await bulkImportMembersAction("board", [
    { userId: " user ", role: Role.guest },
    { userId: "user", role: Role.member },
  ]);
  expect(bulkAddMembers).toHaveBeenCalledWith(
    [{ id: "new-member", userId: "user", boardId: "board", role: Role.guest }],
    expect.anything()
  );
  expect(result).toEqual({ imported: 1, skipped: 0 });
});
