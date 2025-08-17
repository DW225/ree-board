"use client";

import MarkdownRender from "@/components/common/MarkdownRender";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { MergePostsAction } from "@/lib/actions/post/action";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import { mergePosts, rollbackMerge } from "@/lib/signal/postSignals";
import { useComputed } from "@preact/signals-react";
import { Calendar, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface MergePostDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetPost: EnrichedPost; // The post being dropped onto
  readonly sourcePost: EnrichedPost; // The post being dragged
  readonly boardId: string;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate estimated vote count for preview
  const estimatedUniqueVotes = useComputed(() => {
    // This is a simplified estimation - the actual count will be calculated server-side
    return Math.max(targetPost.voteCount, sourcePost.voteCount);
  });

  // Initialize merged content when dialog opens
  useEffect(() => {
    if (isOpen) {
      const allContent = [targetPost.content, sourcePost.content]
        .filter((content) => content.trim())
        .join("\n\n---\n\n");
      setMergedContent(allContent);

      // Focus the textarea after a short delay to ensure dialog is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, targetPost.content, sourcePost.content]);

  const handleMerge = useCallback(async () => {
    if (!mergedContent.trim()) {
      toast.error("Merged content cannot be empty");
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
        boardId
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

      // Log additional error context for debugging
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
        handleMerge();
      }
    },
    [onClose, handleMerge, isSubmitting]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-auto flex flex-col"
        onKeyDown={handleKeyDown}
        aria-describedby="merge-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="merge-dialog-title">Merge Posts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex flex-col gap-4">
          {/* Merged content editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Merged Content:</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Est. {estimatedUniqueVotes.value} unique vote
                  {estimatedUniqueVotes.value !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            <Textarea
              ref={textareaRef}
              value={mergedContent}
              onChange={(e) => setMergedContent(e.target.value)}
              className="font-mono"
              placeholder="Edit the merged content..."
              aria-label="Merged post content"
              disabled={isSubmitting}
            />

            <div className="text-xs text-muted-foreground">
              Tip: Use Ctrl+Enter (Cmd+Enter on Mac) to merge quickly
            </div>
          </div>

          {/* Live preview of merged content */}
          {mergedContent.trim() && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Preview:</h4>
                <div
                  className="overflow-y-auto p-3 border rounded-lg bg-muted/20 prose prose-sm max-w-none"
                  aria-label="Merged content preview"
                >
                  <MarkdownRender content={mergedContent} />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isSubmitting || !mergedContent.trim()}
          >
            {isSubmitting ? "Merging..." : "Merge Posts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
