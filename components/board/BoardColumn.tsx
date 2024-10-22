"use client";

import type { PostType } from "@/db/schema";
import {
  authenticatedDeletePost,
  authenticatedUpdatePostContent,
} from "@/lib/actions/authenticatedActions";
import {
  postSignal,
  removePost,
  updatePostContent,
} from "@/lib/signal/postSignals";
import { toast } from "@/lib/signal/toastSignals";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useSignals } from "@preact/signals-react/runtime";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";

const AddPostForm = dynamic(() => import("@/components/board/AddPostForm"));
const PostCard = dynamic(() => import("@/components/board/PostCard"));

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
  const [isDragginOver, setIsDraggingOver] = useState<boolean>(false);

  const handlePostDelete = useCallback(
    async (id: string) => {
      try {
        await authenticatedDeletePost(id, boardID, userId);
        removePost(id);
      } catch (error) {
        toast.error("Failed to delete post");
        console.error("Failed to delete post:", error);
      }
    },
    [boardID, userId]
  );

  const handlePostUpdate = useCallback(
    async (id: string, newContent: string) => {
      try {
        await authenticatedUpdatePostContent(id, boardID, newContent, userId);
        updatePostContent(id, newContent);
      } catch (error) {
        toast.error("Failed to update post");
        console.error("Failed to update post:", error);
      }
    },
    [boardID, userId]
  );

  useEffect(() => {
    if (!viewOnly) {
      const columnEl = columnRef.current;
      invariant(columnEl, "columnEl is null");

      return dropTargetForElements({
        element: columnEl,
        getData: () => ({ postType }),
        canDrop: ({ source }) => {
          return source.data.postType !== postType.valueOf() && source.data.boardId === boardID;
        },
        getIsSticky: () => true,
        onDragLeave: () => setIsDraggingOver(false),
        onDragEnter: () => setIsDraggingOver(true),
        onDrop: () => setIsDraggingOver(false),
      });
    }
  }, [boardID, postType, viewOnly]);

  return (
    <div
      className={`w-full flex flex-col ${
        isDragginOver ? "bg-sky-200" : "bg-slate-100"
      } rounded-xl mx-2`}
    >
      <div className="rounded-t-lg p-2">
        <h3 className="font-bold text-xl text-center mb-4">{title}</h3>
        {!viewOnly && (
          <AddPostForm postType={postType} boardID={boardID} userId={userId} />
        )}
      </div>
      <div ref={columnRef} className="flex-grow overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {postSignal.value
            .filter((post) => post.type.value === postType)
            .map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PostCard
                  post={post}
                  onDelete={
                    viewOnly ? undefined : () => handlePostDelete(post.id)
                  }
                  viewOnly={viewOnly}
                  onUpdate={handlePostUpdate}
                  userId={userId}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
