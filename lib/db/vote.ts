import { voteTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

export async function upVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) {
  await db.insert(voteTable).values({
    id: nanoid(),
    userId,
    postId,
    boardId,
  });
}

export async function downVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) {
  await db
    .delete(voteTable)
    .where(
      and(
        eq(voteTable.postId, postId),
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
