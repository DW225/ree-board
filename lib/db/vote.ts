import { postTable, voteTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { and, count, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

export async function upVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
): Promise<number> {
  const batchResults = await db.batch([
    db.insert(voteTable).values({
      id: nanoid(),
      userId,
      postId,
      boardId,
    }),
    db
      .update(postTable)
      .set({
        voteCount: sql`${db
          .select({ count: count() })
          .from(voteTable)
          .where(eq(voteTable.postId, postId))}`,
      })
      .where(eq(postTable.id, postId))
      .returning({ voteCount: postTable.voteCount }),
  ]);

  // Extract vote count from the select result
  const selectResult = batchResults[1];
  return selectResult[0].voteCount;
}

export async function downVote(
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
): Promise<number> {
  const batchResults = await db.batch([
    db
      .delete(voteTable)
      .where(
        and(
          eq(voteTable.postId, postId),
          eq(voteTable.userId, userId),
          eq(voteTable.boardId, boardId)
        )
      ),
    db
      .update(postTable)
      .set({
        voteCount: sql`${db
          .select({ count: count() })
          .from(voteTable)
          .where(eq(voteTable.postId, postId))}`,
      })
      .where(eq(postTable.id, postId))
      .returning({ voteCount: postTable.voteCount }),
  ]);

  // Extract vote count from the select result
  const selectResult = batchResults[1];
  return selectResult[0].voteCount;
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
