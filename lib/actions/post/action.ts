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

export const MergePostsAction = async (
  targetPostId: Post["id"],
  sourcePostIds: Post["id"][],
  mergedContent: Post["content"],
  boardId: Board["id"]
): Promise<MergePostResult | NextResponse> =>
  rbacWithAuth(boardId, async (userID): Promise<MergePostResult> => {
    // Input validation
    if (!targetPostId?.trim()) {
      throw new Error("Target post ID is required");
    }
    if (!sourcePostIds?.length) {
      throw new Error("At least one source post is required");
    }
    if (!mergedContent?.trim()) {
      throw new Error("Merged content cannot be empty");
    }
    if (sourcePostIds.includes(targetPostId)) {
      throw new Error("Target post cannot be included in source posts");
    }

    try {
      // Perform the merge operation
      const result = await mergePost(targetPostId, sourcePostIds, mergedContent, boardId);

      // Attempt to publish real-time merge event
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
        // The merge was successful, just real-time sync failed
        // Users will see the change on page refresh
      }

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

      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw new Error("One or more posts could not be found. They may have been deleted by another user.");
        }
        if (error.message.includes("board")) {
          throw new Error("Posts do not belong to the specified board.");
        }
        if (error.message.includes("permission") || error.message.includes("access")) {
          throw new Error("You do not have permission to merge these posts.");
        }
      }

      // Generic error for unexpected issues
      throw new Error("Failed to merge posts due to an unexpected error. Please try again.");
    }
  });
