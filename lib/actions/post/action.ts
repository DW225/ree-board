"use server";

import { rbacWithAuth } from "@/lib/actions/actionWithAuth";
import {
  createPost,
  deletePost,
  mergePost,
  updatePostContent,
  updatePostType,
  type MergePostResult,
} from "@/lib/db/post";
import type { Board } from "@/lib/types/board";
import type { NewPost, Post } from "@/lib/types/post";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";

export const CreatePostAction = async (post: NewPost) =>
  rbacWithAuth(post.boardId, async (userId, role) => {
    logger.logAction("CreatePostAction", { userId, boardId: post.boardId });

    const results = await Promise.all([
      createPost(post),
      ablyClient(post.boardId).publish({
        name: EVENT_TYPE.POST.ADD,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify(post),
      }),
    ]);

    return results;
  });

export const DeletePostAction = async (id: Post["id"], boardId: Board["id"]) =>
  rbacWithAuth(boardId, async (userId) => {
    logger.logAction("DeletePostAction", { userId, boardId, postId: id });

    const results = await Promise.all([
      deletePost(id),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DELETE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id }),
      }),
    ]);

    return results;
  });

export const UpdatePostTypeAction = async (
  id: Post["id"],
  boardId: Board["id"],
  newType: Post["type"]
) =>
  rbacWithAuth(boardId, async (userId) => {
    logger.logAction("UpdatePostTypeAction", {
      userId,
      boardId,
      postId: id,
      newType,
    });

    const results = await Promise.all([
      updatePostType(id, newType),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_TYPE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id, type: newType }),
      }),
    ]);

    return results;
  });

export const UpdatePostContentAction = async (
  id: Post["id"],
  boardId: Board["id"],
  newContent: Post["content"]
) =>
  rbacWithAuth(boardId, async (userId) => {
    logger.logAction("UpdatePostContentAction", {
      userId,
      boardId,
      postId: id,
    });

    const results = await Promise.all([
      updatePostContent(id, newContent),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_CONTENT,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id, content: newContent }),
      }),
    ]);

    return results;
  });

// Zod schema for merge post input validation
const MergePostsSchema = z
  .object({
    targetPostId: z.string().trim().min(1, "Target post ID is required"),
    sourcePostIds: z
      .array(z.string())
      .min(1, "At least one source post is required"),
    mergedContent: z.string().trim().min(1, "Merged content cannot be empty"),
    boardId: z.string().min(1, "Board ID is required"),
  })
  .refine((data) => !data.sourcePostIds.includes(data.targetPostId), {
    message: "Target post cannot be included in source posts",
  });

// Helper function to publish merge event to real-time channel
const publishMergeEvent = async (
  boardId: Board["id"],
  userID: string,
  targetPostId: Post["id"],
  sourcePostIds: Post["id"][],
  result: MergePostResult
): Promise<void> => {
  try {
    await ablyClient(boardId).publish({
      name: EVENT_TYPE.POST.MERGE,
      extras: {
        headers: {
          user: userID,
        },
      },
      data: JSON.stringify({
        targetPostId,
        sourcePostIds,
        mergedPost: result.mergedPost,
        uniqueVoteCount: result.uniqueVoteCount,
        deletedPostIds: result.deletedPostIds,
        timestamp: Date.now(),
      }),
    });
  } catch (realtimeError) {
    // Log real-time error but don't fail the merge operation
    logger.warn("Failed to publish real-time merge event", {
      boardId,
      targetPostId,
      userId: userID,
    }, realtimeError as Error);
  }
};

// Helper function to get user-friendly error message
const getMergeErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Failed to merge posts due to an unexpected error. Please try again.";
  }

  if (error.message.includes("not found")) {
    return "One or more posts could not be found. They may have been deleted by another user.";
  }
  if (error.message.includes("board")) {
    return "Posts do not belong to the specified board.";
  }
  if (
    error.message.includes("permission") ||
    error.message.includes("access")
  ) {
    return "You do not have permission to merge these posts.";
  }

  return "Failed to merge posts due to an unexpected error. Please try again.";
};

export const MergePostsAction = async (
  targetPostId: Post["id"],
  sourcePostIds: Post["id"][],
  mergedContent: Post["content"],
  boardId: Board["id"]
): Promise<MergePostResult> =>
  rbacWithAuth(boardId, async (userId): Promise<MergePostResult> => {
    logger.logAction("MergePostsAction", {
      userId,
      boardId,
      targetPostId,
      sourcePostCount: sourcePostIds.length,
    });

    // Validate inputs using Zod schema
    const validationResult = MergePostsSchema.safeParse({
      targetPostId,
      sourcePostIds,
      mergedContent,
      boardId,
    });

    if (!validationResult.success) {
      throw new Error(validationResult.error.issues[0].message);
    }

    try {
      const result = await mergePost(
        targetPostId,
        sourcePostIds,
        mergedContent,
        boardId
      );
      await publishMergeEvent(
        boardId,
        userId,
        targetPostId,
        sourcePostIds,
        result
      );
      return result;
    } catch (error) {
      logger.logActionError("MergePostsAction", error as Error, {
        userId,
        boardId,
        targetPostId,
        sourcePostIds,
      });

      throw new Error(getMergeErrorMessage(error));
    }
  });
