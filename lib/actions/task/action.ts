"use server";

import { rbacWithAuth } from "@/lib/actions/actionWithAuth";
import { assignTask, createTask, updateTaskState } from "@/lib/db/task";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { NewTask, Task } from "@/lib/types/task";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { logger } from "@/lib/utils/logger";

export const authedCreateAction = async (action: NewTask) =>
  rbacWithAuth(action.boardId, async (userId) => {
    logger.logAction("authedCreateAction", { userId, boardId: action.boardId });

    const results = await Promise.all([
      createTask(action),
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.CREATE,
        data: JSON.stringify(action),
      }),
    ]);

    return results;
  });

export const authedPostAssign = async (action: {
  postId: Post["id"];
  userId: User["id"] | null;
  boardId: Board["id"];
}) =>
  rbacWithAuth(action.boardId, async (userId) => {
    logger.logAction("authedPostAssign", {
      userId,
      boardId: action.boardId,
      postId: action.postId,
    });

    const results = await Promise.all([
      assignTask(action.postId, action.userId),
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.ASSIGN,
        extras: {
          headers: {
            user: action.userId,
          },
        },
        data: JSON.stringify(action),
      }),
    ]);

    return results;
  });

export const authedPostActionStateUpdate = async (action: {
  postId: Post["id"];
  state: Task["state"];
  boardId: Board["id"];
}) =>
  rbacWithAuth(action.boardId, async (userId) => {
    logger.logAction("authedPostActionStateUpdate", {
      userId,
      boardId: action.boardId,
      postId: action.postId,
      state: action.state,
    });

    const results = await Promise.all([
      updateTaskState(action.postId, action.state),
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.STATE_UPDATE,
        data: JSON.stringify(action),
      }),
    ]);

    return results;
  });
