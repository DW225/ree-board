import { postTable, taskTable } from "@/db/schema";
import { PostType } from "@/lib/constants/post";
import type { Board } from "@/lib/types/board";
import type { Transaction } from "@/lib/types/db";
import type { Post } from "@/lib/types/post";
import type { NewTask, Task } from "@/lib/types/task";
import type { User } from "@/lib/types/user";
import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./client";

export function createTask(action: NewTask, transaction?: Transaction) {
  const insert = async (trx: Transaction) => {
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
    const [existing] = await trx
      .select({ id: taskTable.id, boardId: taskTable.boardId })
      .from(taskTable)
      .where(eq(taskTable.postId, action.postId))
      .limit(1);
    if (existing) {
      if (existing.boardId !== action.boardId)
        throw new Error("Task not found");
      return { id: existing.id, created: false };
    }
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
    return { id: result.id, created: true };
  };
  return transaction ? insert(transaction) : db.transaction(insert);
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
    await updateTask(postId, boardId, { userId });
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
  await updateTask(postId, boardId, { state: newState });
}

async function updateTask(
  postId: Post["id"],
  boardId: Board["id"],
  changes: Partial<Pick<Task, "userId" | "state">>
) {
  await db.transaction(async (trx) => {
    const rows = await trx
      .update(taskTable)
      .set({ ...changes, updatedAt: new Date() })
      .where(
        and(
          eq(taskTable.postId, postId),
          eq(taskTable.boardId, boardId),
          inArray(
            taskTable.postId,
            trx
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
    if (rows.length > 0) return;

    // Repair action items saved before post and task creation became atomic.
    const [post] = await trx
      .select({ id: postTable.id })
      .from(postTable)
      .where(
        and(
          eq(postTable.id, postId),
          eq(postTable.boardId, boardId),
          eq(postTable.type, PostType.action_item)
        )
      )
      .limit(1);
    if (!post) throw new Error("Task not found");
    await createTask({ id: nanoid(), postId, boardId, ...changes }, trx);
  });
}
