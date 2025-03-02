"use server";

import {
  assignPostAction,
  createAction,
  updateActionState,
} from "@/lib/db/action";
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
import { downVote, upVote } from "@/lib/db/vote";
import type {
  Action,
  Board,
  NewAction,
  NewBoard,
  NewMember,
  NewPost,
  Post,
  User,
} from "@/lib/types";
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
  id: Post["id"],
  boardId: Board["id"],
  updater: User["id"]
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
  id: Post["id"],
  boardId: Board["id"],
  newType: Post["type"],
  updater: User["id"]
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
  id: Post["id"],
  boardId: Board["id"],
  newContent: Post["content"],
  updater: User["id"]
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

export const authenticatedFetchPostsByBoardID = async (boardId: Board["id"]) =>
  authenticatedAction(() => fetchPostsByBoardID(boardId));

export const authenticatedCreateBoard = async (
  board: NewBoard,
  userId: User["id"]
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
  boardId: Board["id"],
  userId: User["id"]
) => authenticatedAction(() => deleteBoard(boardId, userId));

export const authenticatedFindUserByEmail = async (email: User["email"]) =>
  authenticatedAction(() => findUserByEmail(email));

export const authenticatedAddMemberToBoard = async (newMember: NewMember) =>
  authenticatedAction(() => addMember(newMember));

export const authenticatedRemoveMemberFromBoard = async (
  userId: User["id"],
  boardId: Board["id"]
) => authenticatedAction(() => removeMember(userId, boardId));

export const authenticatedUpVotePost = async (
  postID: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  authenticatedAction(() =>
    Promise.all([
      upVote(postID, userId, boardId),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPVOTE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id: postID }),
      }),
    ])
  );

export const authenticatedDownVotePost = async (
  postID: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  authenticatedAction(() =>
    Promise.all([
      downVote(postID, userId, boardId),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DOWNVOTE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id: postID }),
      }),
    ])
  );

export const authedCreateAction = async (action: NewAction) =>
  authenticatedAction(() =>
    Promise.all([
      createAction(action),
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
  authenticatedAction(() =>
    Promise.all([
      assignPostAction(action.postID, action.userId),
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
  state: Action["state"];
  boardId: Board["id"];
}) =>
  authenticatedAction(() =>
    Promise.all([
      // Update the action state in the database.
      updateActionState(action.postID, action.state),
      // Publish the action state update to Ably for real-time updates on the client-side.
      ablyClient(action.boardId).publish({
        name: EVENT_TYPE.ACTION.STATE_UPDATE,
        data: JSON.stringify(action),
      }),
    ])
  );
