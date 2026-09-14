import { postTable, taskTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { NewTask, Task } from "@/lib/types/task";
import type { User } from "@/lib/types/user";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";

export async function createTask(action: NewTask) {
  return db.transaction(async (trx) => {
    const [post] = await trx
      .select({ id: postTable.id })
      .from(postTable)
      .where(
        and(
          eq(postTable.id, action.postId),
          eq(postTable.boardId, action.boardId)
        )
      )
      .limit(1);
    if (!post) throw new Error("Post not found");
    const [result] = await trx
      .insert(taskTable)
      .values({
        id: action.id,
        boardId: action.boardId,
        postId: action.postId,
        userId: action.userId,
        state: action.state,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
      })
      .returning({ id: taskTable.id });
    return result.id;
  });
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
  userId: User["id"] | null,
  boardId: Board["id"]
) {
  if (!postId) throw new Error("postId is required");
  try {
    const rows = await db
      .update(taskTable)
      .set({ userId, updatedAt: sql`(strftime('%s','now'))` })
      .where(
        and(
          eq(taskTable.postId, postId),
          eq(taskTable.boardId, boardId),
          inArray(
            taskTable.postId,
            db
              .select({ id: postTable.id })
              .from(postTable)
              .where(
                and(eq(postTable.id, postId), eq(postTable.boardId, boardId))
              )
          )
        )
      )
      .returning({ id: taskTable.id })
      .execute();
    if (rows.length === 0) throw new Error("Task not found");
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
 * @param boardId - The authorized board that must contain the task and post.
 * @returns A Promise that resolves when the update operation is complete.
 */
export async function updateTaskState(
  postId: Post["id"],
  newState: Task["state"],
  boardId: Board["id"]
) {
  const rows = await db
    .update(taskTable)
    .set({ state: newState, updatedAt: new Date() })
    .where(
      and(
        eq(taskTable.postId, postId),
        eq(taskTable.boardId, boardId),
        inArray(
          taskTable.postId,
          db
            .select({ id: postTable.id })
            .from(postTable)
            .where(
              and(eq(postTable.id, postId), eq(postTable.boardId, boardId))
            )
        )
      )
    )
    .returning({ id: taskTable.id })
    .execute();
  if (rows.length === 0) throw new Error("Task not found");
}
