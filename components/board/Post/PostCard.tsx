"use client";

import MarkdownRender from "@/components/common/MarkdownRender";
import { Card, CardContent } from "@/components/ui/card";
import {
  DownVotePostAction,
  UpVotePostAction,
} from "@/lib/actions/vote/action";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import {
  decrementPostVoteCount,
  incrementPostVoteCount,
} from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import invariant from "tiny-invariant";
import { useAnonymousMode } from "../AnonymousModeProvider";
import { useVotedPosts } from "../PostProvider";
import { PostFooter } from "./PostFooter";
import { PostHeader } from "./PostHeader";

const MergePostDialog = dynamic(() => import("../MergePostDialog"), {
  ssr: false,
});

interface PostCardProps {
  post: EnrichedPost;
  viewOnly?: boolean;
  onDelete?: (id: Post["id"]) => void;
  onUpdate: (
    id: Post["id"],
    originalContent: Post["content"],
    newContent: Post["content"],
  ) => void;
  userId: User["id"];
  accentColor?: string;
}

function PostCard({
  post,
  viewOnly = false,
  onDelete,
  onUpdate,
  userId,
  accentColor,
}: Readonly<PostCardProps>) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Merge dialog state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [sourcePostForMerge, setSourcePostForMerge] =
    useState<EnrichedPost | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const { isAnonymous } = useAnonymousMode();
  const { addVotedPost, removeVotedPost, hasVoted } = useVotedPosts();
  const [isVoting, setIsVoting] = useState<boolean>(false);

  const ref = useRef<HTMLDivElement>(null);

  const handleVote = useCallback(async () => {
    if (viewOnly || isVoting) return;
    const isVoted = hasVoted(post.id);
    const voteAction = isVoted ? DownVotePostAction : UpVotePostAction;
    const voteCountAction = isVoted
      ? decrementPostVoteCount
      : incrementPostVoteCount;
    const votedPostAction = isVoted ? removeVotedPost : addVotedPost;

    setIsVoting(true);
    try {
      // Optimistic update first for immediate UI feedback
      voteCountAction(post.id);
      votedPostAction(post.id);

      // Perform the server action and get the actual vote count
      await voteAction(post.id, userId, post.boardId);
    } catch (error) {
      console.error("Error while voting:", error);
      toast.error("Failed to vote.");

      // Revert optimistic update on error
      const revertVoteCountAction = isVoted
        ? incrementPostVoteCount
        : decrementPostVoteCount;
      const revertVotedPostAction = isVoted ? addVotedPost : removeVotedPost;

      revertVoteCountAction(post.id);
      revertVotedPostAction(post.id);
    } finally {
      setIsVoting(false);
    }
  }, [
    viewOnly,
    isVoting,
    hasVoted,
    post.id,
    userId,
    post.boardId,
    addVotedPost,
    removeVotedPost,
  ]);

  useEffect(() => {
    if (!viewOnly) {
      const postCardEl = ref.current;
      invariant(postCardEl, "postCardEl is null");

      let cancelled = false;
      let cleanupDrag: (() => void) | undefined;
      let cleanupDrop: (() => void) | undefined;
      let isInitializing = false;
      let isInitialized = false;

      const initializeDragAndDrop = async (): Promise<boolean> => {
        if (isInitializing || isInitialized) return isInitialized;
        isInitializing = true;
        try {
          const { draggable, dropTargetForElements } =
            await import("@atlaskit/pragmatic-drag-and-drop/element/adapter");

          if (cancelled) return false;

          // Make the post draggable
          cleanupDrag = draggable({
            element: postCardEl,
            getInitialData: () => ({
              type: "post",
              id: post.id,
              originalType: post.type,
              boardId: post.boardId,
              post: post, // Include the full post for merge functionality
            }),
            onDragStart: () => setIsDragging(true),
            onDrop: () => setIsDragging(false),
          });

          // Make the post a drop target for merging (only if not in view-only mode)
          if (!viewOnly) {
            cleanupDrop = dropTargetForElements({
              element: postCardEl,
              canDrop: ({ source }) => {
                // Can only drop posts, and not the same post on itself
                return (
                  source.data.type === "post" &&
                  source.data.id !== post.id &&
                  source.data.boardId === post.boardId
                );
              },
              getData: () => ({ type: "post-merge-target", targetPost: post }),
              onDragEnter: () => setIsDropTarget(true),
              onDragLeave: () => setIsDropTarget(false),
              onDrop: ({ source }) => {
                setIsDropTarget(false);
                const sourcePost = source.data.post as EnrichedPost;
                if (sourcePost) {
                  setSourcePostForMerge(sourcePost);
                  setShowMergeDialog(true);
                }
              },
            });
          }

          isInitialized = true;
          return true;
        } catch (error) {
          console.error("Failed to initialize drag and drop:", error);
          return false;
        } finally {
          isInitializing = false;
        }
      };

      const handleInteraction = async () => {
        if (isInitialized || isInitializing) return;

        const didInitialize = await initializeDragAndDrop();
        if (!didInitialize) return;

        postCardEl.removeEventListener("mouseenter", handleInteraction);
        postCardEl.removeEventListener("touchstart", handleInteraction);
      };

      postCardEl.addEventListener("mouseenter", handleInteraction, {
        passive: true,
      });
      postCardEl.addEventListener("touchstart", handleInteraction, {
        passive: true,
      });

      return () => {
        cancelled = true;
        postCardEl.removeEventListener("mouseenter", handleInteraction);
        postCardEl.removeEventListener("touchstart", handleInteraction);
        cleanupDrag?.();
        cleanupDrop?.();
      };
    }
  }, [post.id, post.type, post.boardId, viewOnly]);

  const handleMergeDialogClose = useCallback(() => {
    setShowMergeDialog(false);
    setSourcePostForMerge(null);
  }, []);

  return (
    <div className="relative">
      {/* Drop indicator for merge functionality */}
      {!viewOnly && isDropTarget && <DropIndicator edge="top" gap="8px" />}
      <Card
        className={`w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg shadow-none ${
          accentColor ? "border-l-4" : ""
        } ${isDragging ? "opacity-50" : ""} relative`}
        style={accentColor ? { borderLeftColor: accentColor } : undefined}
        ref={ref}
      >
        {!viewOnly && onDelete && (
          <PostHeader post={post} onDelete={onDelete} onUpdate={onUpdate} />
        )}
        <CardContent className="px-3 pb-2 pt-0">
          <div
            className={`${
              isAnonymous ? "blur-sm select-none" : "select-text"
            } prose prose-sm break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 text-[#374151]`}
          >
            <MarkdownRender content={post.content} />
          </div>
        </CardContent>
        <PostFooter
          post={post}
          viewOnly={viewOnly}
          handleVote={handleVote}
          isVoting={isVoting}
        />
      </Card>

      {/* Merge Dialog */}
      {!viewOnly && showMergeDialog && sourcePostForMerge && (
        <MergePostDialog
          isOpen={showMergeDialog}
          onClose={handleMergeDialogClose}
          targetPost={post}
          sourcePost={sourcePostForMerge}
          boardId={post.boardId}
        />
      )}
    </div>
  );
}

PostCard.displayName = "PostCard";

export default PostCard;
