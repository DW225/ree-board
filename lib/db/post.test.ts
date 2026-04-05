jest.mock("@/db/schema", () => ({
  postTable: {
    id: "id",
    boardId: "boardId",
    author: "author",
  },
  taskTable: {},
  voteTable: {},
}));

jest.mock("drizzle-orm", () => ({
  and: jest.fn(() => ({})),
  eq: jest.fn(() => ({})),
  inArray: jest.fn(() => ({})),
  not: jest.fn(() => ({})),
  sql: {
    placeholder: jest.fn(() => "?"),
  },
}));

const mockDeleteReturning = jest.fn();
const mockUpdateReturning = jest.fn();

jest.mock("./client", () => {
  const selectChain: Record<string, jest.Mock> = {
    from: jest.fn(),
    where: jest.fn(),
    prepare: jest.fn().mockReturnValue({ execute: jest.fn() }),
  };

  const deleteChain: Record<string, jest.Mock> = {
    where: jest.fn(),
    returning: mockDeleteReturning,
  };

  const updateChain: Record<string, jest.Mock> = {
    set: jest.fn(),
    where: jest.fn(),
    returning: mockUpdateReturning,
  };

  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);

  deleteChain.where.mockReturnValue(deleteChain);

  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockReturnValue(updateChain);

  return {
    db: {
      select: jest.fn(() => selectChain),
      delete: jest.fn(() => deleteChain),
      update: jest.fn(() => updateChain),
      transaction: jest.fn(),
    },
    withDbRetry: jest.fn(),
  };
});

import { PostType } from "@/lib/constants/post";
import { Role } from "@/lib/constants/role";
import { deletePost, updatePostContent, updatePostType } from "./post";

describe("post mutation authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when deleting a post affects no rows", async () => {
    mockDeleteReturning.mockResolvedValue([]);

    await expect(
      deletePost("post-1", "board-1", "user-1", Role.member),
    ).rejects.toThrow("Post not found or you do not have permission");
  });

  it("throws when updating post type affects no rows", async () => {
    mockUpdateReturning.mockResolvedValue([]);

    await expect(
      updatePostType(
        "post-1",
        "board-1",
        PostType.to_discuss,
        "user-1",
        Role.member,
      ),
    ).rejects.toThrow("Post not found or you do not have permission");
  });

  it("throws when updating post content affects no rows", async () => {
    mockUpdateReturning.mockResolvedValue([]);

    await expect(
      updatePostContent("post-1", "board-1", "content", "user-1", Role.member),
    ).rejects.toThrow("Post not found or you do not have permission");
  });

  it("allows mutations when a row is returned", async () => {
    mockDeleteReturning.mockResolvedValue([{ id: "post-1" }]);
    mockUpdateReturning.mockResolvedValue([{ id: "post-1" }]);

    await expect(
      deletePost("post-1", "board-1", "user-1", Role.member),
    ).resolves.toBeUndefined();
    await expect(
      updatePostType(
        "post-1",
        "board-1",
        PostType.to_discuss,
        "user-1",
        Role.member,
      ),
    ).resolves.toBeUndefined();
    await expect(
      updatePostContent("post-1", "board-1", "content", "user-1", Role.member),
    ).resolves.toBeUndefined();
  });
});
