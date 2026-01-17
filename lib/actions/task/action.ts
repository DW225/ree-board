"use server";

import { Role } from "@/lib/constants/role";
import { checkMemberRole } from "@/lib/db/member";
import { assignTask, createTask, updateTaskState } from "@/lib/db/task";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { NewTask, Task } from "@/lib/types/task";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

async function rbacWithAuth<T>(boardId: Board["id"], action: () => Promise<T>) {
  // Verify session using centralized DAL
  const session = await verifySession();

  const role = await checkMemberRole(session.userId, boardId);

  if (role === null) {
    console.warn("User not a member of this board");
    redirect("/");
  }

  if (role === Role.guest) {
    console.warn("Access denied for guest role");
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return action();
}

export const authedCreateAction = async (action: NewTask) =>
  rbacWithAuth(action.boardId, () =>
    Promise.all([
      createTask(action),
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.CREATE,
        data: JSON.stringify(action),
      }),
    ])
  );

export const authedPostAssign = async (action: {
  postId: Post["id"];
  userId: User["id"] | null;
  boardId: Board["id"];
}) =>
  rbacWithAuth(action.boardId, () =>
    Promise.all([
      assignTask(action.postId, action.userId),
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
  postId: Post["id"];
  state: Task["state"];
  boardId: Board["id"];
}) =>
  rbacWithAuth(action.boardId, () =>
    Promise.all([
      // Update the action state in the database.
      updateTaskState(action.postId, action.state),
      // Publish the action state update to Ably for real-time updates on the client-side.
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.STATE_UPDATE,
        data: JSON.stringify(action),
      }),
    ])
  );
