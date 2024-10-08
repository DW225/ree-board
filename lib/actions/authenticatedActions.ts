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
import { findUserByEmail } from "@/lib/db/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
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
  authenticatedAction(() =>
    Promise.all([
      createPost(post),
      ablyClient(post.boardId).publish({
        name: EVENT_TYPE.POST.ADD,
        extras: {
          headers: {
            user: post.author,
          },
        },
        data: JSON.stringify(post),
      }),
    ])
  );

export const authenticatedDeletePost = async (
  id: string,
  boardId: string,
  updater: string
) =>
  authenticatedAction(() =>
    Promise.all([
      deletePost(id),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DELETE,
        extras: {
          headers: {
            user: updater,
          },
        },
        data: JSON.stringify({ id }),
      }),
    ])
  );

export const authenticatedUpdatePostType = async (
  id: string,
  boardId: string,
  newType: PostType,
  updater: string
) =>
  authenticatedAction(() =>
    Promise.all([
      updatePostType(id, newType),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_TYPE,
        extras: {
          headers: {
            user: updater,
          },
        },
        data: JSON.stringify({ id, type: newType }),
      }),
    ])
  );

export const authenticatedUpdatePostContent = async (
  id: string,
  boardId: string,
  newContent: string,
  updater: string
) =>
  authenticatedAction(() =>
    Promise.all([
      updatePostContent(id, newContent),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_CONTENT,
        extras: {
          headers: {
            user: updater,
          },
        },
        data: JSON.stringify({ id, content: newContent }),
      }),
    ])
  );

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

export const authenticatedFindUserByEmail = async (email: string) =>
  authenticatedAction(() => findUserByEmail(email));

export const authenticatedAddMemberToBoard = async (newMember: NewMember) =>
  authenticatedAction(() => addMember(newMember));

export const authenticatedRemoveMemberFromBoard = async (
  userId: string,
  boardId: string
) => authenticatedAction(() => removeMember(userId, boardId));
