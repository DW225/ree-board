/// <reference types="jest" />
import { Role } from "@/lib/constants/role";
import { verifySession } from "@/lib/dal";
import {
  addMember,
  bulkAddMembers,
  checkMemberRole,
  fetchMembersByBoardID,
  fetchMembersWithExclude,
} from "@/lib/db/member";
import { findUserByEmail } from "@/lib/db/user";
import type { NewMember } from "@/lib/types/member";
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
  bulkAddMembers: jest.fn(async (members: NewMember[]) =>
    members.map(({ id, userId, role }) => ({ id, userId, role }))
  ),
  checkMemberRole: jest.fn(),
  fetchMembersByBoardID: jest.fn(async () => []),
  fetchMembersWithExclude: jest.fn(async () => []),
  removeMember: jest.fn(),
}));

const sourceMember = (userId: string, role: Role) => ({
  id: `${userId}-membership`,
  userId,
  role,
  username: userId,
  email: `${userId}@example.com`,
  updatedAt: new Date(0),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(fetchMembersByBoardID)
    .mockImplementation(async (boardId) =>
      boardId === "source"
        ? [
            sourceMember("actor", Role.owner),
            sourceMember("user", Role.guest),
            sourceMember("source-owner", Role.owner),
            sourceMember("added", Role.member),
            sourceMember("skipped", Role.guest),
          ]
        : [sourceMember("actor", Role.owner)]
    );
  jest.mocked(verifySession).mockResolvedValue({
    isAuth: true,
    userId: "actor",
    supabaseId: "actor",
    isGuest: false,
  });
  jest.mocked(checkMemberRole).mockResolvedValue(Role.owner);
});

it.each([Role.owner, 99 as Role])(
  "rejects member role %s in individual grants",
  async (role) => {
    await expect(
      addMemberToBoardAction({
        id: "id",
        userId: "user",
        boardId: "board",
        role,
      })
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
      bulkImportMembersAction("board", "source", ["user"])
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
    jest
      .mocked(fetchMembersByBoardID)
      .mockImplementation(async (boardId) => [
        sourceMember("actor", Role.owner),
        ...(boardId === "source" ? [sourceMember("user", role)] : []),
      ]);
    await bulkImportMembersAction(" board ", " source ", [" user "]);
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
    bulkImportMembersAction("board", "source", [" "])
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

it("imports each user once with the stored source role", async () => {
  const result = await bulkImportMembersAction("board", "source", [
    " user ",
    "user",
  ]);
  expect(bulkAddMembers).toHaveBeenCalledWith(
    [{ id: "new-member", userId: "user", boardId: "board", role: Role.guest }],
    expect.anything()
  );
  expect(result).toEqual({
    imported: 1,
    skipped: 0,
    members: [{ id: "new-member", userId: "user", role: Role.guest }],
  });
});

it.each([
  {
    members: [{ id: "saved-member", userId: "added", role: Role.member }],
    imported: 1,
    skipped: 1,
  },
  { members: [], imported: 0, skipped: 2 },
])(
  "returns $imported inserted members and counts $skipped conflicts",
  async (expected) => {
    jest.mocked(bulkAddMembers).mockResolvedValueOnce(expected.members);
    const result = await bulkImportMembersAction("board", "source", [
      "added",
      "skipped",
    ]);
    expect(result).toEqual(expected);
  }
);

it("returns no members when all selected users already belong to the board", async () => {
  jest
    .mocked(fetchMembersByBoardID)
    .mockImplementation(async (boardId) => [
      sourceMember("actor", Role.owner),
      sourceMember("user", boardId === "source" ? Role.guest : Role.member),
    ]);
  await expect(
    bulkImportMembersAction("board", "source", ["user"])
  ).resolves.toEqual({ imported: 0, skipped: 1, members: [] });
});

it("returns no members for an empty import", async () => {
  await expect(bulkImportMembersAction("board", "source", [])).resolves.toEqual(
    {
      imported: 0,
      skipped: 0,
      members: [],
    }
  );
});

it("preserves the owner role when importing a source board owner", async () => {
  await expect(
    bulkImportMembersAction("board", "source", ["source-owner"])
  ).resolves.toMatchObject({
    members: [{ userId: "source-owner", role: Role.owner }],
  });
});
