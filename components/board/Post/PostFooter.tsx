import { AvatarIcon } from "@/components/common/AvatarIcon";
import { Badge } from "@/components/ui/badge";
import { CardFooter } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authedPostAssign } from "@/lib/actions/task/action";
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import { assignTask } from "@/lib/signal/postSignals";
import type { MemberSignal } from "@/lib/types/member";
import type { Task } from "@/lib/types/task";
import { useComputed } from "@preact/signals-react";
import { ThumbsUp } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { useVotedPosts } from "../PostProvider";
import { AssignTaskDialog } from "./AssignTaskDialog";

const STATUS_TEXT: Record<Task["state"], string> = {
  [TaskState.pending]: "To Do",
  [TaskState.inProgress]: "In Progress",
  [TaskState.completed]: "Done",
  [TaskState.cancelled]: "Cancelled",
} as const satisfies Record<Task["state"], string>;

const TASK_STATE_BADGE_STYLES: Record<Task["state"], string> = {
  [TaskState.pending]: "bg-[#F1F5F9] text-[#64748B]",
  [TaskState.inProgress]: "bg-[#FEF3C7] text-[#92400E]",
  [TaskState.completed]: "bg-[#D1FAE5] text-[#065F46]",
  [TaskState.cancelled]: "bg-[#F1F5F9] text-[#94A3B8] line-through",
} as const satisfies Record<Task["state"], string>;

const renderAssigneeTooltip = (
  user: { name?: string } | undefined,
  avatarContent: React.ReactNode,
): React.ReactNode => (
  <>
    <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
    <TooltipContent>
      <p>{user?.name ?? "Unknown"}</p>
    </TooltipContent>
  </>
);

interface PostFooterProps {
  post: EnrichedPost;
  viewOnly: boolean;
  handleVote: () => Promise<void>;
  isVoting?: boolean;
}

export const PostFooter = memo(function PostFooter({
  post,
  viewOnly,
  handleVote,
  isVoting = false,
}: PostFooterProps) {
  const { hasVoted } = useVotedPosts();
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const badgeText = useComputed(() => {
    return STATUS_TEXT[post.task?.state ?? TaskState.pending];
  });

  const handleAssign = useCallback(
    async (member: MemberSignal) => {
      const oldAssigned = post.task?.userId ?? null;
      const postId = post.id;
      const boardId = post.boardId;
      // Optimistic update
      assignTask(postId, member.userId, boardId);
      try {
        await authedPostAssign({
          postId,
          boardId,
          userId: member.userId,
        });
        toast.success("Task assigned");
      } catch (error) {
        console.error("Error assigning task:", error);
        toast.error("Failed to assign task");
        // Rollback optimistic update
        assignTask(postId, oldAssigned, boardId);
      }
    },
    [post.id, post.boardId, post.task?.userId],
  );

  return (
    <CardFooter className="flex justify-between items-center px-3 pb-3 pt-0">
      {post.type === PostType.action_item && (
        <>
          <Badge
            variant="secondary"
            className={`flex items-center justify-center text-xs font-medium border-0 ${TASK_STATE_BADGE_STYLES[post.task?.state ?? TaskState.pending]}`}
          >
            {badgeText}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              {!viewOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAssignOpen(true)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2"
                    aria-label="Assign task to member"
                  >
                    <AvatarIcon
                      userID={post.task?.userId ?? ""}
                      triggers={renderAssigneeTooltip}
                    />
                  </button>
                  <AssignTaskDialog
                    isOpen={isAssignOpen}
                    onClose={() => setIsAssignOpen(false)}
                    currentAssigneeId={post.task?.userId ?? null}
                    onAssign={handleAssign}
                  />
                </>
              ) : (
                <AvatarIcon
                  userID={post.task?.userId ?? ""}
                  triggers={renderAssigneeTooltip}
                />
              )}
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      {post.type !== PostType.action_item && (
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            className={`flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors ${
              hasVoted(post.id)
                ? "text-blue-500"
                : "text-[#94A3B8] hover:text-[#64748B]"
            } ${viewOnly || isVoting ? "cursor-default pointer-events-none opacity-60" : ""}`}
            onClick={handleVote}
            disabled={viewOnly || isVoting}
            aria-label={hasVoted(post.id) ? "Remove vote" : "Vote for this post"}
            aria-pressed={hasVoted(post.id)}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{post.voteCount}</span>
          </button>
          <AvatarIcon userID={post.author ?? ""} />
        </div>
      )}
    </CardFooter>
  );
});

PostFooter.displayName = "PostFooter";
