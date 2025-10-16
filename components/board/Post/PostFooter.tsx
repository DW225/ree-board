import { AvatarIcon } from "@/components/common/AvatarIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { memo, useCallback } from "react";
import { toast } from "sonner";
import MemberList from "../MemberList";
import { useVotedPosts } from "../PostProvider";

const STATUS_TEXT: Record<Task["state"], string> = {
  [TaskState.pending]: "To Do",
  [TaskState.inProgress]: "In Progress",
  [TaskState.completed]: "Done",
  [TaskState.cancelled]: "Cancelled",
} as const satisfies Record<Task["state"], string>;

const renderAssigneeTooltip = (
  user: { name?: string } | undefined,
  avatarContent: React.ReactNode
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
}

export const PostFooter = memo(function PostFooter({
  post,
  viewOnly,
  handleVote,
}: PostFooterProps) {
  const { hasVoted } = useVotedPosts();

  const badgeText = useComputed(() => {
    return STATUS_TEXT[post.task?.state ?? TaskState.pending];
  });

  const handleAssign = useCallback(
    async (member: MemberSignal) => {
      const oldAssigned = post.task?.userId;
      const postId = post.id;
      const boardId = post.boardId;
      try {
        await authedPostAssign({
          postId,
          boardId,
          userId: member.userId,
        });
      } catch (error) {
        console.error("Error assigning task:", error);
        toast.error("Failed to assign task");
        if (oldAssigned) {
          assignTask(postId, oldAssigned, boardId);
        }
      }
    },
    [post.id, post.boardId, post.task?.userId]
  );

  return (
    <CardFooter className="flex justify-between p-2">
      {post.type === PostType.action_item && (
        <>
          <Badge className="flex items-center justify-center">
            <p className="text-xs">{badgeText}</p>
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <Dialog>
                <DialogTrigger>
                  <AvatarIcon
                    userID={post.task?.userId ?? ""}
                    triggers={renderAssigneeTooltip}
                  />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Assign Task</DialogTitle>
                  </DialogHeader>
                  <MemberList viewOnly onAssign={handleAssign} />
                </DialogContent>
              </Dialog>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
      {post.type !== PostType.action_item && (
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center ${
            hasVoted(post.id) ? "text-blue-600" : "text-gray-500"
          } ${viewOnly ? "cursor-default" : ""} px-2`}
          onClick={handleVote}
        >
          <ThumbsUp className="h-4 w-4 mr-2" />
          <span>{post.voteCount}</span>
        </Button>
      )}
    </CardFooter>
  );
});

PostFooter.displayName = "PostFooter";
