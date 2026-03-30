"use client";

import MarkdownRender from "@/components/common/MarkdownRender";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MergePostsAction } from "@/lib/actions/post/action";
import { PostType } from "@/lib/constants/post";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import { mergePosts, rollbackMerge } from "@/lib/signal/postSignals";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import { GitMerge, Heart, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface MergePostDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetPost: EnrichedPost; // The post being dropped onto
  readonly sourcePost: EnrichedPost; // The post being dragged
  readonly boardId: Board["id"];
}

// Full Tailwind class strings must be present as literals for the build scanner.
const POST_ACCENT_BG: Record<Post["type"], string> = {
  [PostType.went_well]: "bg-[#10B981]",
  [PostType.to_improvement]: "bg-[#EF4444]",
  [PostType.to_discuss]: "bg-[#F59E0B]",
  [PostType.action_item]: "bg-[#8B5CF6]",
};

const POST_ACCENT_TEXT: Record<Post["type"], string> = {
  [PostType.went_well]: "text-[#10B981]",
  [PostType.to_improvement]: "text-[#EF4444]",
  [PostType.to_discuss]: "text-[#F59E0B]",
  [PostType.action_item]: "text-[#8B5CF6]",
};

function getPostAccentBg(type: Post["type"]): string {
  return POST_ACCENT_BG[type] ?? "bg-[#94A3B8]";
}

function getPostAccentText(type: Post["type"]): string {
  return POST_ACCENT_TEXT[type] ?? "text-[#94A3B8]";
}

const POST_LABELS: Record<Post["type"], string> = {
  [PostType.went_well]: "Went Well",
  [PostType.to_improvement]: "To Improve",
  [PostType.to_discuss]: "To Discuss",
  [PostType.action_item]: "Action Item",
};

function getPostLabel(type: Post["type"]): string {
  return POST_LABELS[type] ?? type;
}

export default function MergePostDialog({
  isOpen,
  onClose,
  targetPost,
  sourcePost,
  boardId,
}: MergePostDialogProps) {
  const [mergedContent, setMergedContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate estimated vote count for preview
  // Simplified estimation — actual count is calculated server-side
  const mergedVoteCount = Math.max(targetPost.voteCount, sourcePost.voteCount);

  // Initialize merged content when dialog opens
  useEffect(() => {
    if (isOpen) {
      const allContent = [targetPost.content, sourcePost.content]
        .filter((content) => content.trim())
        .join("\n\n---\n\n");
      setMergedContent(allContent);
      setActiveTab("edit");

      // Focus the textarea after a short delay to ensure dialog is rendered
      const focusTimer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    } else {
      setMergedContent("");
      setActiveTab("edit");
    }
  }, [isOpen, targetPost.content, sourcePost.content]);

  const handleMerge = useCallback(async () => {
    if (!mergedContent.trim()) {
      toast.error("Merged content cannot be empty");
      return;
    }

    if (mergedContent.trim().length > 500) {
      toast.error("Merged content must be 500 characters or fewer.");
      return;
    }

    setIsSubmitting(true);
    const sourcePostIds = [sourcePost.id];
    let rollbackData;

    try {
      // Optimistic update with rollback data capture
      rollbackData = mergePosts(targetPost.id, sourcePostIds, mergedContent);

      // Perform server action
      const result = await MergePostsAction(
        targetPost.id,
        sourcePostIds,
        mergedContent,
        boardId,
      );

      if (result && "mergedPost" in result) {
        toast.success("Posts merged successfully");
        onClose();
      } else {
        throw new Error("Merge operation failed");
      }
    } catch (error) {
      console.error("Error merging posts:", error);

      // Rollback optimistic update
      if (rollbackData) {
        rollbackMerge(rollbackData);
        toast.error("Failed to merge posts. Changes have been reverted.");
      } else {
        toast.error("Failed to merge posts. Please refresh the page.");
      }

      if (error instanceof Error) {
        console.error("Merge error details:", {
          message: error.message,
          stack: error.stack,
          targetPostId: targetPost.id,
          sourcePostId: sourcePost.id,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [mergedContent, targetPost.id, sourcePost.id, boardId, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !isSubmitting) {
        e.preventDefault();
        e.stopPropagation();
        handleMerge();
      }
    },
    [onClose, handleMerge, isSubmitting],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && isSubmitting) return;
        onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden [&>button]:hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogDescription className="sr-only">
          Merge two retrospective posts into one. Edit the combined content
          before confirming. The original posts will be removed.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#E2E8F0] shrink-0">
          <DialogTitle className="text-lg font-bold text-[#0F172A]">
            Merge Posts
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close merge posts dialog"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#94A3B8]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5">
          {/* Posts being merged */}
          <div className="flex flex-col gap-2" aria-label="Posts being merged">
            <span className="text-[11px] font-semibold text-[#94A3B8] tracking-[1.5px]">
              POSTS BEING MERGED
            </span>
            {[targetPost, sourcePost].map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-lg border border-[#E2E8F0]"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${getPostAccentBg(post.type)}`}
                />
                <span className="text-sm text-[#0F172A] line-clamp-1">
                  {post.content}
                </span>
              </div>
            ))}
          </div>

          {/* Edit / Preview tabs */}
          <div className="flex flex-col gap-2.5">
            {/* Tab bar */}
            <div className="flex h-9 rounded-[6px] bg-[#F1F5F9] p-[3px]">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                disabled={isSubmitting}
                className={`flex flex-1 items-center justify-center rounded-[4px] text-sm font-medium transition-all disabled:opacity-50 ${
                  activeTab === "edit"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#94A3B8]"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                disabled={isSubmitting}
                className={`flex flex-1 items-center justify-center rounded-[4px] text-sm font-medium transition-all disabled:opacity-50 ${
                  activeTab === "preview"
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#94A3B8]"
                }`}
              >
                Preview
              </button>
            </div>

            {/* Tab content */}
            {activeTab === "edit" ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  ref={textareaRef}
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  maxLength={500}
                  disabled={isSubmitting}
                  className="rounded-lg border-[#6366F1] text-sm text-[#0F172A] leading-relaxed min-h-[100px] focus-visible:ring-[#6366F1] disabled:opacity-50"
                />
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Edit the merged content above before confirming. The original
                  posts will be removed.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${getPostAccentBg(targetPost.type)}`}
                  />
                  <span
                    className={`text-xs font-semibold ${getPostAccentText(targetPost.type)}`}
                  >
                    {getPostLabel(targetPost.type)}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Heart
                      className="w-3.5 h-3.5 text-[#94A3B8]"
                      aria-hidden="true"
                    />
                    <span className="text-xs text-[#94A3B8]">
                      {mergedVoteCount} votes
                    </span>
                  </div>
                </div>
                {mergedContent ? (
                  <div className="prose prose-sm max-w-none text-[#0F172A] leading-relaxed [&>*:last-child]:mb-0">
                    <MarkdownRender content={mergedContent} />
                  </div>
                ) : (
                  <p className="text-sm text-[#94A3B8] italic">
                    No content yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between h-[68px] px-6 border-t border-[#E2E8F0] shrink-0">
          <span className="text-[13px] text-[#94A3B8]">2 posts selected</span>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-[18px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleMerge}
              disabled={isSubmitting || !mergedContent.trim()}
              className="rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white px-[18px] gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitMerge className="w-[15px] h-[15px]" aria-hidden="true" />
              )}
              {isSubmitting ? "Merging..." : "Merge Posts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
