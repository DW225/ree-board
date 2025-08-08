import { postTable, voteTable, taskTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { NewPost, Post } from "@/lib/types/post";
import { eq, sql, inArray, and, not } from "drizzle-orm";
import { db } from "./client";

export const createPost = async (post: NewPost) => {
  const newPosts = await db
    .insert(postTable)
    .values({
      id: post.id,
      content: post.content,
      author: post.author,
      boardId: post.boardId,
      type: post.type,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    })
    .returning();

  return newPosts[0];
};

const prepareFetchPostsByBoardID = db
  .select()
  .from(postTable)
  .where(eq(postTable.boardId, sql.placeholder("boardId")))
  .prepare();

export const fetchPostsByBoardID = async (boardId: Board["id"]) => {
  return await prepareFetchPostsByBoardID.execute({ boardId });
};

const prepareDeletePost = db
  .delete(postTable)
  .where(eq(postTable.id, sql.placeholder("postId")))
  .prepare();

export const deletePost = async (postId: Post["id"]) => {
  await prepareDeletePost.execute({ postId });
};

export const updatePostType = async (id: Post["id"], newType: Post["type"]) => {
  await db
    .update(postTable)
    .set({
      type: newType,
      updatedAt: new Date(),
    })
    .where(eq(postTable.id, id))
    .execute();
};

export const updatePostContent = async (
  id: Post["id"],
  newContent: Post["content"]
) => {
  await db
    .update(postTable)
    .set({
      content: newContent,
      updatedAt: new Date(),
    })
    .where(eq(postTable.id, id))
    .execute();
};

export interface MergePostResult {
  mergedPost: Post;
  uniqueVoteCount: number;
  deletedPostIds: string[];
}

/**
 * Merges multiple posts into a single post with proper vote recalculation.
 * Vote counts are recalculated based on unique voters, not just combined totals.
 * 
 * @param targetPostId - The post that will receive the merged content
 * @param sourcePostIds - Array of post IDs to be merged into the target
 * @param mergedContent - The combined content for the merged post
 * @param boardId - Board ID for validation
 * @returns Promise containing the merged post and metadata
 */
export const mergePost = async (
  targetPostId: Post["id"],
  sourcePostIds: Post["id"][],
  mergedContent: Post["content"],
  boardId: Board["id"]
): Promise<MergePostResult> => {
  if (sourcePostIds.length === 0) {
    throw new Error("At least one source post is required for merging");
  }

  if (sourcePostIds.includes(targetPostId)) {
    throw new Error("Target post cannot be included in source posts");
  }

  return await db.transaction(async (tx) => {
    // 1. Validate that all posts exist and belong to the same board
    const allPostIds = [targetPostId, ...sourcePostIds];
    const posts = await tx
      .select()
      .from(postTable)
      .where(and(
        inArray(postTable.id, allPostIds),
        eq(postTable.boardId, boardId)
      ));

    if (posts.length !== allPostIds.length) {
      throw new Error("One or more posts not found or don't belong to the specified board");
    }

    const targetPost = posts.find(p => p.id === targetPostId);
    if (!targetPost) {
      throw new Error("Target post not found");
    }

    // 2. Get unique voters across all posts being merged
    const uniqueVoters = await tx
      .selectDistinct({ userId: voteTable.userId })
      .from(voteTable)
      .where(inArray(voteTable.postId, allPostIds));

    const uniqueVoteCount = uniqueVoters.length;

    // 3. Get votes to keep (one per unique voter, preferring target post votes)
    const votesToKeep = await tx
      .select({
        id: voteTable.id,
        userId: voteTable.userId,
        postId: voteTable.postId
      })
      .from(voteTable)
      .where(inArray(voteTable.postId, allPostIds))
      .orderBy(
        sql`CASE WHEN ${voteTable.postId} = ${targetPostId} THEN 0 ELSE 1 END`
      );

    // 4. Create a map to keep only the first vote per user (prioritizing target post)
    const votesByUser = new Map<string, typeof votesToKeep[0]>();
    votesToKeep.forEach(vote => {
      if (!votesByUser.has(vote.userId)) {
        votesByUser.set(vote.userId, vote);
      }
    });

    const votesToKeepIds = Array.from(votesByUser.values()).map(v => v.id);

    // 5. Delete duplicate votes (keep only one per user)
    if (votesToKeepIds.length > 0) {
      await tx
        .delete(voteTable)
        .where(and(
          inArray(voteTable.postId, allPostIds),
          not(inArray(voteTable.id, votesToKeepIds))
        ));
    }

    // 6. Update remaining votes to point to target post
    await tx
      .update(voteTable)
      .set({ postId: targetPostId })
      .where(inArray(voteTable.id, votesToKeepIds));

    // 7. Update target post with merged content and correct vote count
    const updatedPosts = await tx
      .update(postTable)
      .set({
        content: mergedContent,
        voteCount: uniqueVoteCount,
        updatedAt: new Date(),
      })
      .where(eq(postTable.id, targetPostId))
      .returning();

    const mergedPost = updatedPosts[0];

    // 8. Handle tasks - for action_item posts, keep the target post's task
    // and delete tasks associated with source posts
    await tx
      .delete(taskTable)
      .where(inArray(taskTable.postId, sourcePostIds));

    // 9. Delete source posts (this will cascade delete any remaining votes/tasks)
    await tx
      .delete(postTable)
      .where(inArray(postTable.id, sourcePostIds));

    return {
      mergedPost,
      uniqueVoteCount,
      deletedPostIds: sourcePostIds,
    };
  });
};
