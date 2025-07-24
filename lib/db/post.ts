import { postTable } from "@/db/schema";
import type { Board } from "@/lib/types/board";
import type { NewPost, Post } from "@/lib/types/post";
import { eq } from "drizzle-orm";
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

export const fetchPostsByBoardID = async (boardId: Board["id"]) => {
  return await db
    .select()
    .from(postTable)
    .where(eq(postTable.boardId, boardId));
};

export const deletePost = async (postId: Post["id"]) => {
  await db.delete(postTable).where(eq(postTable.id, postId)).execute();
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
