"use client";

import {
  DeletePostAction,
  UpdatePostContentAction,
} from "@/lib/actions/post/action";
import { PostType } from "@/lib/constants/post";
import {
  removePost,
  sortedPostsSignal,
  updatePostContent,
} from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
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
const PostCard = dynamic(() => import("@/components/board/Post/PostCard"), {
  ssr: false,
});

interface BoardColumnProps {
  boardId: string;
  title: string;
  postType: PostType;
  viewOnly?: boolean;
  userId: string;
  accentColor?: string;
}

interface AnimatedPost {
  id: string;
  isRemoving: boolean;
}

const COLUMN_ACCENT_CLASS: Record<PostType, string> = {
  [PostType.went_well]: "bg-emerald-500",
  [PostType.to_improvement]: "bg-red-500",
  [PostType.to_discuss]: "bg-amber-400",
  [PostType.action_item]: "bg-violet-500",
} as const satisfies Record<PostType, string>;

export default function BoardColumn({
  boardId,
  title,
  postType,
  viewOnly = false,
  userId,
  accentColor,
}: Readonly<BoardColumnProps>) {
  useSignals();
  const columnRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const filteredPosts = useComputed(() =>
    sortedPostsSignal.value.filter((post) => post.type === postType),
  );

  const animatedPosts: Signal<AnimatedPost[]> = useComputed(() =>
    filteredPosts.value.map((post) => ({
      id: post.id,
      isRemoving: false,
    })),
  );

  const handlePostDelete = useCallback(
    async (id: Post["id"]) => {
      try {
        await DeletePostAction(id, boardId);

        removePost(id);
      } catch (error) {
        toast.error("Failed to delete post");
        console.error("Failed to delete post:", error);
      }
    },
    [boardId],
  );

  const handlePostUpdate = useCallback(
    async (
      id: Post["id"],
      originalContent: Post["content"],
      newContent: Post["content"],
    ) => {
      try {
        // Update the post content in the local state optimistically
        updatePostContent(id, newContent);

        // Update the post content on the server
        await UpdatePostContentAction(id, boardId, newContent);
      } catch (error) {
        toast.error("Failed to update post");
        console.error("Failed to update post:", error);

        // Revert optimistic update on error
        updatePostContent(id, originalContent);
      }
    },
    [boardId],
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
          const { dropTargetForElements } =
            await import("@atlaskit/pragmatic-drag-and-drop/element/adapter");

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
              accentColor={accentColor}
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
      accentColor,
    ],
  );

  // Use accentColor prop when provided; fall back to Tailwind class from the legacy map.
  // Inline style is required here because Tailwind cannot safely purge arbitrary hex values
  // that are only known at runtime (dynamic prop). The project ESLint config has no
  // no-inline-styles rule — this pattern is intentional and lint-safe.
  const accentStyle = accentColor
    ? { backgroundColor: accentColor }
    : undefined;
  const accentClass = accentColor ? "" : COLUMN_ACCENT_CLASS[postType];
  const postCount = filteredPosts.value.length;

  return (
    <div
      className={`w-full flex flex-col bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-colors duration-200 ${
        isDraggingOver ? "ring-2 ring-blue-300 ring-offset-1" : ""
      }`}
    >
      {/* Color-coded top accent bar */}
      <div
        className={`w-full h-1 rounded-t-xl flex-shrink-0 ${accentClass}`}
        style={accentStyle}
      />

      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
          <span className="inline-flex items-center justify-center rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-xs font-medium text-[#64748B]">
            {postCount}
          </span>
        </div>
      </div>

      {/* Cards area — also serves as the drop target */}
      <div
        ref={columnRef}
        className="flex-grow overflow-y-auto flex flex-col gap-2 px-3 pb-3 pt-1"
      >
        {!viewOnly && (
          <AddPostForm postType={postType} boardId={boardId} userId={userId} />
        )}
        {renderPosts}
      </div>
    </div>
  );
}
