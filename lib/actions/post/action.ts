"use server";

import { Role } from "@/lib/constants/role";
import { checkRoleByKindeID } from "@/lib/db/member";
import {
  createPost,
  deletePost,
  updatePostContent,
  updatePostType,
  mergePost,
  type MergePostResult,
} from "@/lib/db/post";
import type { Board } from "@/lib/types/board";
import type { NewPost, Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";

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

// Zod schema for merge post input validation
const MergePostsSchema = z.object({
  targetPostId: z.string().trim().min(1, "Target post ID is required"),
  sourcePostIds: z.array(z.string()).min(1, "At least one source post is required"),
  mergedContent: z.string().trim().min(1, "Merged content cannot be empty"),
  boardId: z.string().min(1, "Board ID is required"),
}).refine(
  (data) => !data.sourcePostIds.includes(data.targetPostId),
  { message: "Target post cannot be included in source posts" }
);

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
    console.error("Failed to publish real-time merge event:", realtimeError);
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
  if (error.message.includes("permission") || error.message.includes("access")) {
    return "You do not have permission to merge these posts.";
  }

  return "Failed to merge posts due to an unexpected error. Please try again.";
};

export const MergePostsAction = async (
  targetPostId: Post["id"],
  sourcePostIds: Post["id"][],
  mergedContent: Post["content"],
  boardId: Board["id"]
): Promise<MergePostResult | NextResponse> =>
  rbacWithAuth(boardId, async (userID): Promise<MergePostResult> => {
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
      const result = await mergePost(targetPostId, sourcePostIds, mergedContent, boardId);
      await publishMergeEvent(boardId, userID, targetPostId, sourcePostIds, result);
      return result;
    } catch (error) {
      // Enhanced error logging with context
      console.error("Error merging posts:", {
        error: error instanceof Error ? error.message : String(error),
        targetPostId,
        sourcePostIds,
        boardId,
        userId: userID,
        timestamp: new Date().toISOString(),
      });

      throw new Error(getMergeErrorMessage(error));
    }
  });
