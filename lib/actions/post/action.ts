"use server";

import { Role } from "@/lib/constants/role";
import { checkRoleByKindeID } from "@/lib/db/member";
import {
  createPost,
  deletePost,
  updatePostContent,
  updatePostType,
} from "@/lib/db/post";
import type { Board } from "@/lib/types/board";
import type { NewPost, Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

async function rbacWithAuth<T>(
  boardId: Board["id"],
  action: (userID: User["id"]) => Promise<T>
) {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const kindeUser = await getUser();
  const kindeID = kindeUser?.id;

  if (!isAuthenticated || !kindeID) {
    console.warn("Not authenticated");
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const user = await checkRoleByKindeID(kindeID, boardId);

  if (!user) {
    console.warn("User not found");
    redirect("/");
  }

  if (user.role === Role.guest) {
    console.warn("Access denied for guest role");
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return action(user.userID);
}

export const CreatePostAction = async (post: NewPost) =>
  rbacWithAuth(post.boardId, (userID) =>
    Promise.all([
      createPost(post),
      ablyClient(post.boardId).publish({
        name: EVENT_TYPE.POST.ADD,
        extras: {
          headers: {
            user: userID,
          },
        },
        data: JSON.stringify(post),
      }),
    ])
  );

export const DeletePostAction = async (id: Post["id"], boardId: Board["id"]) =>
  rbacWithAuth(boardId, (userID) =>
    Promise.all([
      deletePost(id),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DELETE,
        extras: {
          headers: {
            user: userID,
          },
        },
        data: JSON.stringify({ id }),
      }),
    ])
  );

export const UpdatePostTypeAction = async (
  id: Post["id"],
  boardId: Board["id"],
  newType: Post["type"]
) =>
  rbacWithAuth(boardId, (userID) =>
    Promise.all([
      updatePostType(id, newType),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_TYPE,
        extras: {
          headers: {
            user: userID,
          },
        },
        data: JSON.stringify({ id, type: newType }),
      }),
    ])
  );

export const UpdatePostContentAction = async (
  id: Post["id"],
  boardId: Board["id"],
  newContent: Post["content"]
) =>
  rbacWithAuth(boardId, (userID) =>
    Promise.all([
      updatePostContent(id, newContent),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_CONTENT,
        extras: {
          headers: {
            user: userID,
          },
        },
        data: JSON.stringify({ id, content: newContent }),
      }),
    ])
  );
