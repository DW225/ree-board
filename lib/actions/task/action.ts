"use server";

import { rbacWithAuth } from "@/lib/actions/actionWithAuth";
import { TaskState } from "@/lib/constants/task";
import { assignTask, createTask, updateTaskState } from "@/lib/db/task";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { NewTask, Task } from "@/lib/types/task";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

const taskTargetSchema = z.object({
  postId: idSchema,
  boardId: idSchema,
});
const taskAssignmentSchema = taskTargetSchema.extend({
  userId: idSchema.nullable(),
});
const taskStateSchema = taskTargetSchema.extend({ state: z.enum(TaskState) });

const taskCreateSchema = taskTargetSchema.extend({
  id: idSchema,
  userId: idSchema.nullable().default(null),
  state: z.enum(TaskState).default(TaskState.pending),
});

export const authedCreateAction = async (action: NewTask) => {
  const data = taskCreateSchema.parse(action);
  return rbacWithAuth(data.boardId, async (userId) => {
    logger.logAction("authedCreateAction", { userId, boardId: data.boardId });
    const now = new Date();
    const task = { ...data, createdAt: now, updatedAt: now };
    const result = await createTask(task);
    const published = await ablyClient(data.boardId).publish({
      name: EVENT_TYPE.ACTION.CREATE,
      data: JSON.stringify(task),
    });
    return [result, published];
  });
};

export const authedPostAssign = async (action: {
  postId: Post["id"];
  userId: User["id"] | null;
  boardId: Board["id"];
}) => {
  const data = taskAssignmentSchema.parse(action);
  return rbacWithAuth(data.boardId, async (userId) => {
    logger.logAction("authedPostAssign", {
      userId,
      boardId: data.boardId,
      postId: data.postId,
    });

    const result = await assignTask(data.postId, data.userId, data.boardId);
    const published = await ablyClient(data.boardId).publish({
      name: EVENT_TYPE.ACTION.ASSIGN,
      extras: {
        headers: {
          user: data.userId,
        },
      },
      data: JSON.stringify(data),
    });

    return [result, published];
  });
};

export const authedPostActionStateUpdate = async (action: {
  postId: Post["id"];
  state: Task["state"];
  boardId: Board["id"];
}) => {
  const data = taskStateSchema.parse(action);
  return rbacWithAuth(data.boardId, async (userId) => {
    logger.logAction("authedPostActionStateUpdate", {
      userId,
      boardId: data.boardId,
      postId: data.postId,
      state: data.state,
    });

    const result = await updateTaskState(data.postId, data.state, data.boardId);
    const published = await ablyClient(data.boardId).publish({
      name: EVENT_TYPE.ACTION.STATE_UPDATE,
      data: JSON.stringify(data),
    });

    return [result, published];
  });
};
