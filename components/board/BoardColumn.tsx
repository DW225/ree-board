"use client";

import type { PostType } from "@/db/schema";
import {
  authenticatedDeletePost,
  authenticatedUpdatePostContent,
} from "@/lib/actions/authenticatedActions";
import { postSignal, removePost, updatePost } from "@/lib/signal/postSignals";
import { toast } from "@/lib/signal/toastSignals";
import { useSignals } from "@preact/signals-react/runtime";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef } from "react";
import PostCard from "./PostCard";

const AddPostForm = dynamic(() => import("@/components/board/AddPostForm"));

interface BoardColumnProps {
  boardID: string;
  title: string;
  postType: PostType;
  viewOnly?: boolean;
  userId: string;
}

export default function BoardColumn({
  boardID,
  title,
  postType,
  viewOnly = false,
  userId,
}: Readonly<BoardColumnProps>) {
  useSignals();
  const columnRef = useRef<HTMLDivElement>(null);

  const handlePostDelete = async (id: string) => {
    try {
      await authenticatedDeletePost(id, boardID, userId);
      removePost(id);
    } catch (error) {
      toast.error("Failed to delete post");
      console.error("Failed to delete post:", error);
    }
  };

  const handlePostUpdate = async (id: string, newContent: string) => {
    try {
      await authenticatedUpdatePostContent(id, boardID, newContent, userId);
      updatePost({ id, content: newContent });
    } catch (error) {
      toast.error("Failed to update post");
      console.error("Failed to update post:", error);
    }
  };

  return (
    <div className="w-full flex flex-col bg-gray-100 rounded-xl mx-2">
      <div className="bg-gray-100 rounded-t-lg p-2">
        <h3 className="font-bold text-xl text-center mb-4">{title}</h3>
        {!viewOnly && (
          <AddPostForm postType={postType} boardID={boardID} userId={userId} />
        )}
      </div>
      <div ref={columnRef} className="flex-grow overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {postSignal.value
            .filter((post) => post.type === postType)
            .map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PostCard
                  id={post.id}
                  type={post.type}
                  initialContent={post.content}
                  onDelete={
                    viewOnly ? undefined : () => handlePostDelete(post.id)
                  }
                  viewOnly={viewOnly}
                  onUpdate={handlePostUpdate}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
