import { DialogItem } from "@/components/common/DialogItem";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { authedPostActionStateUpdate } from "@/lib/actions/task/action";
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import type { EnrichedPost} from "@/lib/signal/postSignals";
import { updatePostState } from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";
import { MoreHorizontal } from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface PostHeaderProps {
  post: EnrichedPost;
  onDelete: (id: Post["id"]) => void;
  onUpdate: (
    id: Post["id"],
    originalContent: Post["content"],
    newContent: Post["content"]
  ) => void;
}

export const PostHeader = memo(function PostHeader({
  post,
  onDelete,
  onUpdate,
}: PostHeaderProps) {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusRef = useRef<HTMLElement>(null);

  const handleEdit = useCallback(() => {
    if (onUpdate) {
      onUpdate(post.id, post.content, message);
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
    [post.id, post.task?.state, post.boardId]
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
    <CardHeader className="flex flex-row items-center justify-end space-y-0 p-2">
      <DropdownMenu
        open={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <Button ref={dropdownTriggerRef} variant="ghost" className="h-8 w-8 p-0">
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
              <DialogTitle>Edit Post</DialogTitle>
              <DialogDescription>
                Edit your post below and click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[200px] w-full ~md:~min-w-[21.875rem]/[34.375rem]"
              aria-label="Edit post content"
              autoComplete="on"
              spellCheck="true"
            />
            <DialogFooter className="mt-4">
              <Button
                onClick={() => {
                  handleEdit();
                  handleDialogItemOpenChange(false);
                }}
                type="submit"
              >
                Save
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
