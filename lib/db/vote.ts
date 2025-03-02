import { voteTable } from "@/db/schema";
import type { Board, Post, User } from "@/lib/types";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

export async function upVote(
  postID: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) {
  await db.insert(voteTable).values({
    id: nanoid(),
    userId,
    postId: postID,
    boardId,
  });
}

export async function downVote(
  postID: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) {
  await db
    .delete(voteTable)
    .where(
      and(
        eq(voteTable.postId, postID),
        eq(voteTable.userId, userId),
        eq(voteTable.boardId, boardId)
      )
    );
}

export async function fetchUserVotedPost(
  userId: User["id"]
): Promise<string[]> {
  const result = await db
    .select({
      postId: voteTable.postId,
    })
    .from(voteTable)
    .where(eq(voteTable.userId, userId));

  return result.map((item) => item.postId);
}
