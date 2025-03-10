import { actionsTable } from "@/db/schema";
import type { Action, NewAction } from "@/lib/types/action";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { eq } from "drizzle-orm";
import { db } from "./client";

export async function createAction(action: NewAction) {
  const result = await db
    .insert(actionsTable)
    .values({
      id: action.id,
      boardId: action.boardId,
      postId: action.postId,
      userId: action.userId,
      state: action.state,
    })
    .returning({ id: actionsTable.id })
    .execute();
  return result[0].id;
}

export async function fetchActions(boardId: Board["id"]) {
  return await db
    .select()
    .from(actionsTable)
    .where(eq(actionsTable.boardId, boardId));
}

export async function assignPostAction(
  postID: Post["id"],
  userId: User["id"] | null
) {
  if (!postID) throw new Error("postId is required");
  try {
    await db
      .update(actionsTable)
      .set({ userId, updatedAt: new Date() })
      .where(eq(actionsTable.postId, postID))
      .execute();
  } catch (error) {
    console.error(`Failed to assign action for post ${postID}:`, error);
    throw error;
  }
}

/**
 * Updates the state of an action associated with a specific post.
 *
 * @param postId - The unique identifier of the post whose action state is being updated.
 * @param newState - The new state to be set for the action, of type ActionState.
 * @returns A Promise that resolves when the update operation is complete.
 */
export async function updateActionState(
  postID: Post["id"],
  newState: Action["state"]
) {
  await db
    .update(actionsTable)
    .set({ state: newState, updatedAt: new Date() })
    .where(eq(actionsTable.postId, postID))
    .execute();
}
