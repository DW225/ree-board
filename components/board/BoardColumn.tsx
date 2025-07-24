"use client";

import {
  DeletePostAction,
  UpdatePostContentAction,
} from "@/lib/actions/post/action";
import type { PostType } from "@/lib/constants/post";
import {
  removePost,
  sortedPostsSignal,
  updatePostContent,
} from "@/lib/signal/postSignals";
import type { Signal } from "@preact/signals-react";
import { useComputed } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import invariant from "tiny-invariant";

const AddPostForm = dynamic(() => import("@/components/board/AddPostForm"), {
  ssr: false,
});
const PostCard = dynamic(() => import("@/components/board/PostCard"), {
  ssr: false,
});

interface BoardColumnProps {
  boardId: string;
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
  boardId,
  title,
  postType,
  viewOnly = false,
  userId,
}: Readonly<BoardColumnProps>) {
  useSignals();
  const columnRef = useRef<HTMLDivElement>(null);
  const [isDragginOver, setIsDraggingOver] = useState<boolean>(false);
  const filteredPosts = useComputed(() =>
    sortedPostsSignal.value.filter((post) => post.type === postType)
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
        await DeletePostAction(id, boardId);

        removePost(id);
      } catch (error) {
        toast.error("Failed to delete post");
        console.error("Failed to delete post:", error);
      }
    },
    [boardId]
  );

  const handlePostUpdate = useCallback(
    async (id: string, newContent: string) => {
      try {
        // Update the post content on the server
        await UpdatePostContentAction(id, boardId, newContent);

        // Update the post content in the local state
        updatePostContent(id, newContent);
      } catch (error) {
        toast.error("Failed to update post");
        console.error("Failed to update post:", error);
      }
    },
    [boardId]
  );

  useEffect(() => {
    if (!viewOnly) {
      const columnEl = columnRef.current;
      invariant(columnEl, "columnEl is null");

      let cleanup: (() => void) | undefined;
      let isInitializing = false;
      let isInitialized = false;

      // Lazy load drop target functionality
      const initializeDropTarget = async () => {
        if (isInitializing || isInitialized) return;
        isInitializing = true;
        try {
          const { dropTargetForElements } = await import(
            "@atlaskit/pragmatic-drag-and-drop/element/adapter"
          );

          cleanup = dropTargetForElements({
            element: columnEl,
            getData: () => ({ postType }),
            canDrop: ({ source }) => {
              return (
                source.data.postType !== postType.valueOf() &&
                source.data.boardId === boardId
              );
            },
            getIsSticky: () => true,
            onDragLeave: () => setIsDraggingOver(false),
            onDragEnter: () => setIsDraggingOver(true),
            onDrop: () => setIsDraggingOver(false),
          });
          isInitialized = true;
        } catch (error) {
          console.error("Failed to initialize drop target:", error);
        } finally {
          isInitializing = false;
        }
      };

      // Initialize on hover or first interaction with the column
      const handleInteraction = () => {
        if (!isInitialized && !isInitializing) {
          initializeDropTarget();
          columnEl.removeEventListener("mouseenter", handleInteraction);
          columnEl.removeEventListener("touchstart", handleInteraction);
        }
      };

      columnEl.addEventListener("mouseenter", handleInteraction, {
        passive: true,
      });
      columnEl.addEventListener("touchstart", handleInteraction, {
        passive: true,
      });

      return () => {
        columnEl.removeEventListener("mouseenter", handleInteraction);
        columnEl.removeEventListener("touchstart", handleInteraction);
        if (cleanup) {
          cleanup();
        }
      };
    }
  }, [boardId, postType, viewOnly]);

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
          <AddPostForm postType={postType} boardId={boardId} userId={userId} />
        )}
      </div>
      <div ref={columnRef} className="flex-grow overflow-y-auto p-3 space-y-3">
        {renderPosts}
      </div>
    </div>
  );
}
