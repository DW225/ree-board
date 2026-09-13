import { postTable, voteTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { and, count, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

async function changeVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"],
  operation: "upvote" | "downvote"
): Promise<number> {
  return db.transaction(async (tx) => {
    const postCondition = and(
      eq(postTable.id, postId),
      eq(postTable.boardId, boardId)
    );
    const [post] = await tx
      .select({ id: postTable.id })
      .from(postTable)
      .where(postCondition);
    if (!post) throw new Error("Post not found in this board");

    if (operation === "upvote") {
      await tx
        .insert(voteTable)
        .values({ id: nanoid(), userId, postId, boardId });
    } else {
      const removed = await tx
        .delete(voteTable)
        .where(
          and(
            eq(voteTable.postId, postId),
            eq(voteTable.userId, userId),
            eq(voteTable.boardId, boardId)
          )
        )
        .returning({ id: voteTable.id });
      if (removed.length === 0) throw new Error("Vote not found");
    }

    const [updatedPost] = await tx
      .update(postTable)
      .set({
        voteCount: sql`${tx
          .select({ count: count() })
          .from(voteTable)
          .where(
            and(eq(voteTable.postId, postId), eq(voteTable.boardId, boardId))
          )}`,
      })
      .where(postCondition)
      .returning({ voteCount: postTable.voteCount });
    return updatedPost.voteCount;
  });
}

export async function upVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
): Promise<number> {
  return changeVote(postId, userId, boardId, "upvote");
}

export async function downVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
): Promise<number> {
  return changeVote(postId, userId, boardId, "downvote");
}

const prepareFetchUserVotedPost = db
  .select({
    postId: voteTable.postId,
  })
  .from(voteTable)
  .where(eq(voteTable.userId, sql.placeholder("userId")))
  .prepare();

export async function fetchUserVotedPost(
  userId: User["id"]
): Promise<string[]> {
  const result = await prepareFetchUserVotedPost.execute({ userId });

  return result.map((item) => item.postId);
}
