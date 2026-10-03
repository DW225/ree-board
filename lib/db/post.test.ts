/// <reference types="jest" />
import type * as TestDatabase from "@/tests/helpers/database";
import { PostType } from "@/lib/constants/post";
import { Role } from "@/lib/constants/role";
import { db } from "./client";
import { deletePost, updatePostContent, updatePostType } from "./post";

jest.mock("./client", () =>
  jest
    .requireActual<typeof TestDatabase>("@/tests/helpers/database")
    .createTestDatabase()
);

const client = db.$client;
/** Reads stored rows in a stable order for before-and-after comparisons. */
const state = async () =>
  (await client.execute("SELECT * FROM post ORDER BY id")).rows;

beforeAll(async () => {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY);
    CREATE TABLE board (id TEXT PRIMARY KEY);
    CREATE TABLE post (
      id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES board(id),
      user_id TEXT REFERENCES user(id), content TEXT NOT NULL,
      post_type INTEGER NOT NULL, vote_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO user VALUES ('actor'), ('other');
    INSERT INTO board VALUES ('board-a'), ('board-b');
  `);
});
beforeEach(async () => {
  await client.executeMultiple(`
    DELETE FROM post;
    INSERT INTO post(id,board_id,user_id,content,post_type) VALUES
      ('target','board-a','actor','target content',0),
      ('other-author','board-a','other','other content',0),
      ('foreign','board-b','actor','foreign content',0);
  `);
});

const mutations = [
  {
    name: "delete",
    run: (id: string, board: string, role: Role) =>
      deletePost(id, board, "actor", role),
  },
  {
    name: "type update",
    run: (id: string, board: string, role: Role) =>
      updatePostType(id, board, PostType.to_discuss, "actor", role),
  },
  {
    name: "content update",
    run: (id: string, board: string, role: Role) =>
      updatePostContent(id, board, "saved content", "actor", role),
  },
];

describe.each(mutations)("post $name", ({ name, run }) => {
  it.each([
    { role: Role.member, id: "target" },
    { role: Role.owner, id: "other-author" },
  ])("changes only the selected post for role $role", async ({ role, id }) => {
    const before = await state();
    await run(id, "board-a", role);
    const after = await state();
    expect(after.filter((row) => row.id !== id)).toEqual(
      before.filter((row) => row.id !== id)
    );
    const saved = after.find((row) => row.id === id);
    if (name === "delete") {
      expect(saved).toBeUndefined();
    } else {
      expect(saved).toEqual({
        ...before.find((row) => row.id === id),
        ...(name === "type update"
          ? { post_type: PostType.to_discuss }
          : { content: "saved content" }),
        updated_at: expect.any(Number),
      });
      expect(saved?.updated_at).not.toBe(1);
    }
  });

  it("denies a member's change to another author's post", async () => {
    const before = await state();
    await expect(run("other-author", "board-a", Role.member)).rejects.toThrow(
      "Post not found or you do not have permission"
    );
    expect(await state()).toEqual(before);
  });

  it.each([Role.member, Role.owner])(
    "rejects a post from another board for role %s",
    async (role) => {
      const before = await state();
      await expect(run("foreign", "board-a", role)).rejects.toThrow(
        "Post not found or you do not have permission"
      );
      expect(await state()).toEqual(before);
    }
  );

  it("rejects a missing post without changing stored rows", async () => {
    const before = await state();
    await expect(run("missing", "board-a", Role.member)).rejects.toThrow(
      "Post not found or you do not have permission"
    );
    expect(await state()).toEqual(before);
  });
});
