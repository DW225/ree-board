import { taskTable } from "@/db/schema";
import type { Task, NewTask } from "@/lib/types/task";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { eq, sql } from "drizzle-orm";
import { db } from "./client";

export async function createTask(action: NewTask) {
  const result = await db
    .insert(taskTable)
    .values({
      id: action.id,
      boardId: action.boardId,
      postId: action.postId,
      userId: action.userId,
      state: action.state,
    })
    .returning({ id: taskTable.id })
    .execute();
  return result[0].id;
}

const prepareFetchTasks = db
  .select()
  .from(taskTable)
  .where(eq(taskTable.boardId, sql.placeholder("boardId")))
  .prepare();

export async function fetchTasks(boardId: Board["id"]) {
  return await prepareFetchTasks.execute({ boardId });
}

export async function assignTask(
  postId: Post["id"],
  userId: User["id"] | null
) {
  if (!postId) throw new Error("postId is required");
  try {
    await db
      .update(taskTable)
      .set({ userId, updatedAt: sql`(strftime('%s','now'))` })
      .where(eq(taskTable.postId, postId))
      .execute();
  } catch (error) {
    console.error("Failed to assign action for post %s:", postId, error);
    throw error;
  }
}

/**
 * Updates the state of an action associated with a specific post.
 *
 * @param postId - The unique identifier of the post whose action state is being updated.
 * @param newState - The new state to be set for the action, of type TaskState.
 * @returns A Promise that resolves when the update operation is complete.
 */
export async function updateTaskState(
  postId: Post["id"],
  newState: Task["state"]
) {
  await db
    .update(taskTable)
    .set({ state: newState, updatedAt: new Date() })
    .where(eq(taskTable.postId, postId))
    .execute();
}
