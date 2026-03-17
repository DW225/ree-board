import { AvatarIcon } from "@/components/common/AvatarIcon";
import { DialogItem } from "@/components/common/DialogItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { authedPostActionStateUpdate } from "@/lib/actions/task/action";
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import { postsSignal, updatePostState } from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";
import { MoreHorizontal } from "lucide-react";
import { memo, useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

const POST_TYPE_LABEL: Record<PostType, string> = {
  [PostType.went_well]: "Went Well",
  [PostType.to_improvement]: "To Improve",
  [PostType.action_item]: "Action Item",
  [PostType.to_discuss]: "To Discuss",
};

const POST_TYPE_BADGE_COLOR: Record<PostType, string> = {
  [PostType.went_well]: "bg-emerald-100 text-emerald-700",
  [PostType.to_improvement]: "bg-red-100 text-red-700",
  [PostType.action_item]: "bg-violet-100 text-violet-700",
  [PostType.to_discuss]: "bg-amber-100 text-amber-700",
};

const MAX_POST_LENGTH = 500;

interface PostHeaderProps {
  post: EnrichedPost;
  onDelete: (id: Post["id"]) => void;
  onUpdate: (
    id: Post["id"],
    originalContent: Post["content"],
    newContent: Post["content"],
  ) => void | Promise<void>;
}

export const PostHeader = memo(function PostHeader({
  post,
  onDelete,
  onUpdate,
}: PostHeaderProps) {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusRef = useRef<HTMLElement>(null);

  const handleEdit = useCallback(async () => {
    if (onUpdate) {
      // Read the CURRENT content from the signal at submit time, not the stale closure value.
      // This ensures that if a collaborator updated the post via real-time between when the
      // dialog opened and when Save is clicked, the rollback will restore THEIR version.
      const currentContent =
        postsSignal.value.find((p) => p.id === post.id)?.content ??
        post.content;
      await onUpdate(post.id, currentContent, message);
    }
    setIsEditing(false);
  }, [onUpdate, post.id, post.content, message]);

  const handleStatusChange = useCallback(
    async (newStatus: Task["state"]) => {
      if (post.task?.state === newStatus) return;

      const oldState = post.task?.state;
      try {
        updatePostState(post.id, newStatus);

        await authedPostActionStateUpdate({
          postId: post.id,
          state: newStatus,
          boardId: post.boardId,
        });
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
        if (oldState) {
          updatePostState(post.id, oldState);
        }
      }
    },
    [post.id, post.task?.state, post.boardId],
  );

  function handleDialogItemSelect() {
    focusRef.current = dropdownTriggerRef.current;
  }

  function handleDialogItemOpenChange(open: boolean) {
    setIsEditing(open);
    if (open === false) {
      setIsDropdownOpen(false);
    }
  }

  return (
    <CardHeader className="flex flex-row items-center justify-end space-y-0 pt-2 px-2 pb-0">
      <DropdownMenu
        open={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <Button
            ref={dropdownTriggerRef}
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={5}
          hidden={isEditing}
          onCloseAutoFocus={(event) => {
            if (focusRef.current) {
              focusRef.current.focus();
              focusRef.current = null;
              event.preventDefault();
            }
          }}
        >
          {post.type === PostType.action_item && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => handleStatusChange(TaskState.pending)}
                >
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange(TaskState.inProgress)}
                >
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange(TaskState.completed)}
                >
                  Done
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DialogItem
            triggerChildren={
              <span className="text-blue-500 focus:text-blue-500 focus:bg-blue-50">
                Edit
              </span>
            }
            onSelect={() => {
              handleDialogItemSelect();
              setMessage(post.content);
            }}
            onOpenChange={handleDialogItemOpenChange}
            className="~max-w-[425px] ~md:~max-w-[31.25rem]/[43.75rem]"
          >
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>Edit Post</DialogTitle>
                <Badge
                  className={`text-xs font-medium border-0 ${POST_TYPE_BADGE_COLOR[post.type]}`}
                >
                  {POST_TYPE_LABEL[post.type]}
                </Badge>
              </div>
              <DialogDescription>
                Edit your post below and click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[200px] w-full ~md:~min-w-[21.875rem]/[34.375rem]"
                aria-label="Edit post content"
                autoComplete="on"
                spellCheck="true"
                maxLength={MAX_POST_LENGTH}
              />
              <p
                className={`text-xs text-right ${message.length >= MAX_POST_LENGTH ? "text-red-500" : "text-[#94A3B8]"}`}
              >
                {message.length} / {MAX_POST_LENGTH}
              </p>
            </div>
            <DialogFooter className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span>Posted by</span>
                <AvatarIcon userID={post.author ?? ""} className="size-5" />
              </div>
              <Button
                onClick={() => {
                  startTransition(async () => {
                    await handleEdit();
                    handleDialogItemOpenChange(false);
                  });
                }}
                type="button"
                disabled={!message.trim() || isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogItem>

          <DropdownMenuItem
            onClick={() => onDelete(post.id)}
            className="text-red-500 focus:text-red-500 focus:bg-red-50"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
  );
});

PostHeader.displayName = "PostHeader";
