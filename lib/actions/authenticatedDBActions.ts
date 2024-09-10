"use server";

import type { NewBoard, NewPost } from "@/db/schema";
import { createBoard, deleteBoard } from "@/lib/db/board";
import { createPost, fetchPostsByBoardID } from "@/lib/db/post";
import { findUserIdByKindeID } from "@/lib/db/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

export async function authenticatedAction<T>(
  action: () => Promise<T>
): Promise<T | null> {
  const { isAuthenticated } = getKindeServerSession();

  if (!isAuthenticated()) {
    console.warn("Not authenticated");
    redirect("/api/auth/login");
  }

  return await action();
}

export const authenticatedCreatePost = async (post: NewPost) =>
  authenticatedAction(() => createPost(post));

export const authenticatedFetchPostsByBoardID = async (boardId: string) =>
  authenticatedAction(() => fetchPostsByBoardID(boardId));

export const authenticatedCreateBoard = async (
  board: NewBoard,
  userId: string
) =>
  authenticatedAction(() =>
    createBoard(
      {
        ...board,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: userId,
      },
      userId
    )
  );

export const authenticatedDeleteBoard = async (
  boardId: string,
  userId: string
) => authenticatedAction(() => deleteBoard(boardId, userId));

export const authenticatedFindUserIdByKindeID = async (kindeId: string) => authenticatedAction(() => findUserIdByKindeID(kindeId));
