"use server";

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
import { actionWithAuth } from "../actionWithAuth";

export const authenticatedCreatePost = async (post: NewPost) =>
  actionWithAuth(() =>
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
  actionWithAuth(() =>
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
  actionWithAuth(() =>
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
  actionWithAuth(() =>
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
