import type { Post } from "@/db/schema";
import { voteTable } from "@/db/schema";
import { db } from "./client";
import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";

export async function upVote(
  postID: Post["id"],
  userId: string,
  boardId: string
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
  userId: string,
  boardId: string
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

export async function fetchUserVotedPost(userId: string): Promise<string[]> {
  const result = await db
    .select({
      postId: voteTable.postId,
    })
    .from(voteTable)
    .where(eq(voteTable.userId, userId));

  return result.map((item) => item.postId);
}
