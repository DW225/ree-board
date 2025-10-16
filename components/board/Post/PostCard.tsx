"use client";

import MarkdownRender from "@/components/common/MarkdownRender";
import { Card, CardContent } from "@/components/ui/card";
import {
  DownVotePostAction,
  UpVotePostAction,
} from "@/lib/actions/vote/action";
import { PostType } from "@/lib/constants/post";
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

const cardTypes: Record<Post["type"], string> = {
  [PostType.went_well]: "bg-green-100",
  [PostType.to_improvement]: "bg-red-100",
  [PostType.to_discuss]: "bg-yellow-100",
  [PostType.action_item]: "bg-purple-100",
} as const satisfies Record<Post["type"], string>;

interface PostCardProps {
  post: EnrichedPost;
  viewOnly?: boolean;
  onDelete?: (id: Post["id"]) => void;
  onUpdate: (
    id: Post["id"],
    originalContent: Post["content"],
    newContent: Post["content"]
  ) => void;
  userId: User["id"];
}

function PostCard({
  post,
  viewOnly = false,
  onDelete,
  onUpdate,
  userId,
}: Readonly<PostCardProps>) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Merge dialog state
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [sourcePostForMerge, setSourcePostForMerge] =
    useState<EnrichedPost | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const { isAnonymous } = useAnonymousMode();
  const { addVotedPost, removeVotedPost, hasVoted } = useVotedPosts();

  const ref = useRef<HTMLDivElement>(null);

  const handleVote = useCallback(async () => {
    if (viewOnly) return;
    const isVoted = hasVoted(post.id);
    const voteAction = isVoted ? DownVotePostAction : UpVotePostAction;
    const voteCountAction = isVoted
      ? decrementPostVoteCount
      : incrementPostVoteCount;
    const votedPostAction = isVoted ? removeVotedPost : addVotedPost;

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
    }
  }, [
    viewOnly,
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

      let cleanupDrag: (() => void) | undefined;
      let cleanupDrop: (() => void) | undefined;
      let isInitializing = false;
      let isInitialized = false;

      const initializeDragAndDrop = async () => {
        if (isInitializing || isInitialized) return;
        isInitializing = true;
        try {
          const { draggable, dropTargetForElements } = await import(
            "@atlaskit/pragmatic-drag-and-drop/element/adapter"
          );

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
        } catch (error) {
          console.error("Failed to initialize drag and drop:", error);
        } finally {
          isInitializing = false;
        }
      };

      const handleInteraction = () => {
        if (!isInitialized && !isInitializing) {
          initializeDragAndDrop();
          postCardEl.removeEventListener("mouseenter", handleInteraction);
          postCardEl.removeEventListener("touchstart", handleInteraction);
        }
      };

      postCardEl.addEventListener("mouseenter", handleInteraction, {
        passive: true,
      });
      postCardEl.addEventListener("touchstart", handleInteraction, {
        passive: true,
      });

      return () => {
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
        className={`w-full ${cardTypes[post.type]} ${
          isDragging ? "opacity-50" : ""
        } relative`}
        ref={ref}
      >
        {!viewOnly && onDelete && (
          <PostHeader post={post} onDelete={onDelete} onUpdate={onUpdate} />
        )}
        <CardContent className="px-3 py-1">
          <div
            className={`${
              isAnonymous ? "blur-sm select-none" : "select-text"
            } prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0`}
          >
            <MarkdownRender content={post.content} />
          </div>
        </CardContent>
        <PostFooter post={post} viewOnly={viewOnly} handleVote={handleVote} />
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
