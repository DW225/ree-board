"use server";

import type { NewBoard, NewMember, NewPost, PostType } from "@/db/schema";
import { createBoard, deleteBoard } from "@/lib/db/board";
import { addMember, removeMember } from "@/lib/db/member";
import {
  createPost,
  deletePost,
  fetchPostsByBoardID,
  updatePostContent,
  updatePostType,
} from "@/lib/db/post";
import { findUserByEmail, findUserIdByKindeID } from "@/lib/db/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

async function authenticatedAction<T>(
  action: () => Promise<T>
): Promise<T | null> {
  const { isAuthenticated } = getKindeServerSession();

  if (!isAuthenticated()) {
    console.warn("Not authenticated");
    redirect("/");
  }

  return await action();
}

export const authenticatedCreatePost = async (post: NewPost) =>
  authenticatedAction(() => createPost(post));

export const authenticatedDeletePost = async (postId: string) =>
  authenticatedAction(() => deletePost(postId));

export const authenticatedUpdatePostType = async (
  id: string,
  newType: PostType
) => authenticatedAction(() => updatePostType(id, newType));

export const authenticatedUpdatePostContent = async (id: string, newContent: string) =>
  authenticatedAction(() => updatePostContent(id, newContent));

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

export const authenticatedFindUserIdByKindeID = async (kindeId: string) =>
  authenticatedAction(() => findUserIdByKindeID(kindeId));

export const authenticatedFindUserByEmail = async (email: string) =>
  authenticatedAction(() => findUserByEmail(email));

export const authenticatedAddMemberToBoard = async (newMember: NewMember) =>
  authenticatedAction(() => addMember(newMember));

export const authenticatedRemoveMemberFromBoard = async (
  userId: string,
  boardId: string
) => authenticatedAction(() => removeMember(userId, boardId));
