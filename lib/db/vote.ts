import { voteTable } from "@/db/schema";
import { db } from "./client";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function upVote(postId: string, userId: string, boardId: string) {
  await db.insert(voteTable).values({
    id: nanoid(),
    userId,
    postId,
    boardId,
  });
}

export async function downVote(voteId: string) {
  await db.delete(voteTable).where(eq(voteTable.id, voteId));
}
