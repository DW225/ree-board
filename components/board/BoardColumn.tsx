"use client";

import {
  DeletePostAction,
  UpdatePostContentAction,
} from "@/lib/actions/post/action";
import type { PostType } from "@/lib/constants/post";
import {
  postSignal,
  removePost,
  updatePostContent,
} from "@/lib/signal/postSignals";
import { toast } from "@/lib/signal/toastSignals";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { Signal } from "@preact/signals-react";
import { useComputed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";

const AddPostForm = dynamic(() => import("@/components/board/AddPostForm"), {
  ssr: false,
});
const PostCard = dynamic(() => import("@/components/board/PostCard"), {
  ssr: false,
});

interface BoardColumnProps {
  boardID: string;
  title: string;
  postType: PostType;
  viewOnly?: boolean;
  userId: string;
}

interface AnimatedPost {
  id: string;
  isRemoving: boolean;
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
  const filteredPosts = useComputed(() =>
    postSignal.value.filter((post) => post.type.value === postType)
  );

  const animatedPosts: Signal<AnimatedPost[]> = useComputed(() =>
    filteredPosts.value.map((post) => ({
      id: post.id,
      isRemoving: false,
    }))
  );

  const handlePostDelete = useCallback(
    async (id: string) => {
      try {
        await DeletePostAction(id, boardID);

        removePost(id);
      } catch (error) {
        toast.error("Failed to delete post");
        console.error("Failed to delete post:", error);
      }
    },
    [boardID]
  );

  const handlePostUpdate = useCallback(
    async (id: string, newContent: string) => {
      try {
        // Update the post content on the server
        await UpdatePostContentAction(id, boardID, newContent);

        // Update the post content in the local state
        updatePostContent(id, newContent);
      } catch (error) {
        toast.error("Failed to update post");
        console.error("Failed to update post:", error);
      }
    },
    [boardID]
  );

  useEffect(() => {
    if (!viewOnly) {
      const columnEl = columnRef.current;
      invariant(columnEl, "columnEl is null");

      return dropTargetForElements({
        element: columnEl,
        getData: () => ({ postType }),
        canDrop: ({ source }) => {
          return (
            source.data.postType !== postType.valueOf() &&
            source.data.boardId === boardID
          );
        },
        getIsSticky: () => true,
        onDragLeave: () => setIsDraggingOver(false),
        onDragEnter: () => setIsDraggingOver(true),
        onDrop: () => setIsDraggingOver(false),
      });
    }
  }, [boardID, postType, viewOnly]);

  const renderPosts = useMemo(
    () =>
      animatedPosts.value.map((animatedPost) => {
        const post = filteredPosts.value.find((p) => p.id === animatedPost.id);
        if (!post) return null;

        return (
          <div
            key={post.id}
            className={"animate-in fade-in slide-in-from-bottom-5 duration-300"}
          >
            <PostCard
              post={post}
              onDelete={viewOnly ? undefined : () => handlePostDelete(post.id)}
              viewOnly={viewOnly}
              onUpdate={handlePostUpdate}
              userId={userId}
            />
          </div>
        );
      }),
    [
      animatedPosts.value,
      filteredPosts.value,
      viewOnly,
      handlePostUpdate,
      userId,
      handlePostDelete,
    ]
  );

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
        {renderPosts}
      </div>
    </div>
  );
}
