"use server";

import { assignTask, createTask, updateTaskState } from "@/lib/db/task";
import type { Task, NewTask } from "@/lib/types/task";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { actionWithAuth } from "../actionWithAuth";

export const authedCreateAction = async (action: NewTask) =>
  actionWithAuth(() =>
    Promise.all([
      createTask,
      action,
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.CREATE,
        data: JSON.stringify(action),
      }),
    ])
  );

export const authedPostAssign = async (action: {
  postID: Post["id"];
  userId: User["id"] | null;
  boardId: Board["id"];
}) =>
  actionWithAuth(() =>
    Promise.all([
      assignTask(action.postID, action.userId),
      // Publish the action to Ably for real-time updates on the client-side.
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.ASSIGN,
        extras: {
          headers: {
            user: action.userId,
          },
        },
        data: JSON.stringify(action),
      }),
    ])
  );

export const authedPostActionStateUpdate = async (action: {
  postID: Post["id"];
  state: Task["state"];
  boardId: Board["id"];
}) =>
  actionWithAuth(() =>
    Promise.all([
      // Update the action state in the database.
      updateTaskState(action.postID, action.state),
      // Publish the action state update to Ably for real-time updates on the client-side.
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.STATE_UPDATE,
        data: JSON.stringify(action),
      }),
    ])
  );
