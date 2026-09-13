"use server";

import { rbacWithAuth } from "@/lib/actions/actionWithAuth";
import { PostType } from "@/lib/constants/post";
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

/** Creates a post after validating authorization and publishes the update. */
export const CreatePostAction = async (post: NewPost) => {
  const data = CreatePostSchema.parse(post);
  return rbacWithAuth(data.boardId, async (userId) => {
    logger.logAction("CreatePostAction", { userId, boardId: data.boardId });
    const result = await createPost({ ...data, author: userId });
    try {
      await ablyClient(data.boardId).publish({
        name: EVENT_TYPE.POST.ADD,
        extras: { headers: { user: userId } },
        data: JSON.stringify(result),
      });
    } catch (realtimeError) {
      logger.warn(
        "Failed to publish real-time create event",
        { boardId: data.boardId, userId },
        realtimeError as Error
      );
    }
    return result;
  });
};

export const DeletePostAction = async (
  postId: Post["id"],
  targetBoardId: Board["id"]
) => {
  const { id, boardId } = DeletePostSchema.parse({
    id: postId,
    boardId: targetBoardId,
  });
  return rbacWithAuth(boardId, async (userId, role) => {
    logger.logAction("DeletePostAction", { userId, boardId, postId: id });

    await deletePost(id, boardId, userId, role);
    try {
      await ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DELETE,
        extras: { headers: { user: userId } },
        data: JSON.stringify({ id }),
      });
    } catch (realtimeError) {
      logger.warn(
        "Failed to publish real-time delete event",
        { boardId, userId },
        realtimeError as Error
      );
    }
  });
};

export const UpdatePostTypeAction = async (
  postId: Post["id"],
  targetBoardId: Board["id"],
  value: Post["type"]
) => {
  const { id, boardId, newType } = UpdatePostTypeSchema.parse({
    id: postId,
    boardId: targetBoardId,
    newType: value,
  });
  return rbacWithAuth(boardId, async (userId, role) => {
    logger.logAction("UpdatePostTypeAction", {
      userId,
      boardId,
      postId: id,
      newType,
    });

    await updatePostType(id, boardId, newType, userId, role);
    try {
      await ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_TYPE,
        extras: { headers: { user: userId } },
        data: JSON.stringify({ id, type: newType }),
      });
    } catch (realtimeError) {
      logger.warn(
        "Failed to publish real-time update-type event",
        { boardId, userId },
        realtimeError as Error
      );
    }
  });
};

export const UpdatePostContentAction = async (
  postId: Post["id"],
  targetBoardId: Board["id"],
  value: Post["content"]
) => {
  const { id, boardId, newContent } = UpdatePostContentSchema.parse({
    id: postId,
    boardId: targetBoardId,
    newContent: value,
  });
  return rbacWithAuth(boardId, async (userId, role) => {
    logger.logAction("UpdatePostContentAction", {
      userId,
      boardId,
      postId: id,
    });

    await updatePostContent(id, boardId, newContent, userId, role);
    try {
      await ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPDATE_CONTENT,
        extras: { headers: { user: userId } },
        data: JSON.stringify({ id, content: newContent }),
      });
    } catch (realtimeError) {
      logger.warn(
        "Failed to publish real-time update-content event",
        { boardId, userId },
        realtimeError as Error
      );
    }
  });
};

const PostIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
const BoardIdSchema = z.string().trim().min(1);
const PostContentSchema = z
  .string()
  .trim()
  .min(1, "Content cannot be empty")
  .max(500);
const PostTypeSchema = z.enum(PostType);

const CreatePostSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{21}$/, "Invalid post ID"),
  boardId: BoardIdSchema,
  type: PostTypeSchema,
  content: PostContentSchema,
});

const DeletePostSchema = z.object({
  id: PostIdSchema,
  boardId: BoardIdSchema,
});

const UpdatePostTypeSchema = z.object({
  id: PostIdSchema,
  boardId: BoardIdSchema,
  newType: PostTypeSchema,
});

const UpdatePostContentSchema = z.object({
  id: PostIdSchema,
  boardId: BoardIdSchema,
  newContent: PostContentSchema,
});

// Zod schema for merge post input validation
const MergePostsSchema = z
  .object({
    targetPostId: PostIdSchema,
    sourcePostIds: z
      .array(PostIdSchema)
      .min(1, "At least one source post is required")
      .max(100),
    mergedContent: z
      .string()
      .trim()
      .min(1, "Merged content cannot be empty")
      .max(500),
    boardId: BoardIdSchema,
  })
  .refine(
    (data) => new Set(data.sourcePostIds).size === data.sourcePostIds.length,
    {
      message: "Source post IDs must be unique",
    }
  )
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
    logger.warn(
      "Failed to publish real-time merge event",
      {
        boardId,
        targetPostId,
        userId: userID,
      },
      realtimeError as Error
    );
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
  target: Post["id"],
  sources: Post["id"][],
  content: Post["content"],
  board: Board["id"]
): Promise<MergePostResult> => {
  const { targetPostId, sourcePostIds, mergedContent, boardId } =
    MergePostsSchema.parse({
      targetPostId: target,
      sourcePostIds: sources,
      mergedContent: content,
      boardId: board,
    });
  return rbacWithAuth(
    boardId,
    async (userId, role): Promise<MergePostResult> => {
      logger.logAction("MergePostsAction", {
        userId,
        boardId,
        targetPostId,
        sourcePostCount: sourcePostIds.length,
      });

      try {
        const result = await mergePost(
          targetPostId,
          sourcePostIds,
          mergedContent,
          boardId,
          userId,
          role
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
    }
  );
};
