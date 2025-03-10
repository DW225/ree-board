"use client";

import { AvatarIcon } from "@/components/common/AvatarIcon";
import { DialogItem } from "@/components/common/DialogItem";
import CustomLink from "@/components/common/Link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActionState, PostType } from "@/db/schema";
import {
  authedPostActionStateUpdate,
  authedPostAssign,
  authenticatedDownVotePost,
  authenticatedUpVotePost,
} from "@/lib/actions/authenticatedActions";
import {
  assignPostAction,
  decrementPostVoteCount,
  incrementPostVoteCount,
  updatePostState,
  type PostSignal,
} from "@/lib/signal/postSignals";
import { toast } from "@/lib/signal/toastSignals";
import type { Action } from "@/lib/types/action";
import type { MemberSignal } from "@/lib/types/member";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useComputed } from "@preact/signals-react";
import { MoreHorizontal, ThumbsUp } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import invariant from "tiny-invariant";
import { useAnonymousMode } from "./AnonymousModeProvider";
import MemberList from "./MemberList";
import { useVotedPosts } from "./PostProvider";

interface PostCardHeaderProps {
  post: PostSignal;
  onDelete: (id: Post["id"]) => void;
  onUpdate: (id: Post["id"], newContent: Post["content"]) => void;
}

const PostCardHeader = memo(function PostCardHeader({
  post,
  onDelete,
  onUpdate,
}: PostCardHeaderProps) {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTriggerRef = useRef(null);
  const focusRef = useRef(null);

  const handleEdit = useCallback(() => {
    if (onUpdate) {
      onUpdate(post.id, message);
    }
    setIsEditing(false);
  }, [onUpdate, post.id, message]);

  const handleStatusChange = useCallback(
    async (newStatus: Action["state"]) => {
      if (post.action?.state.value === newStatus) return;

      const oldState = post.action?.state.value;
      try {
        updatePostState(post.id, newStatus);
        await authedPostActionStateUpdate({
          postID: post.id,
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
    [post.id, post.action?.state.value, post.boardId]
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
          <Button variant="ghost" className="h-8 w-8 p-0">
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
              // Type assertion to tell TypeScript that focusRef.current has a focus method
              (focusRef.current as HTMLElement).focus();
              focusRef.current = null;
              event.preventDefault();
            }
          }}
        >
          {post.type.value === PostType.action_item && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(ActionState.pending)}
                  >
                    To Do
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(ActionState.inProgress)}
                  >
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(ActionState.completed)}
                  >
                    Done
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          <DialogItem
            triggerChildren={
              <span className="text-blue-500 focus:text-blue-500 focus:bg-blue-50">
                Edit
              </span>
            }
            onSelect={() => {
              handleDialogItemSelect();
              setMessage(post.content.value);
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

PostCardHeader.displayName = "PostCardHeader";

const STATUS_TEXT: Record<Action["state"], string> = {
  [ActionState.pending]: "To Do",
  [ActionState.inProgress]: "In Progress",
  [ActionState.completed]: "Done",
  [ActionState.cancelled]: "Cancelled",
} as const satisfies Record<Action["state"], string>;

interface PostCardFooterProps {
  post: PostSignal;
  viewOnly: boolean;
  handleVote: () => Promise<void>;
}

const PostCardFooter = memo(function PostCardFooter({
  post,
  viewOnly,
  handleVote,
}: PostCardFooterProps) {
  const { hasVoted } = useVotedPosts();

  const badgeText = useComputed(() => {
    return STATUS_TEXT[post.action?.state.value ?? ActionState.pending];
  });

  const handleAssign = useCallback(
    async (member: MemberSignal) => {
      const oldAssigned = post.action?.assigned.value;
      try {
        await authedPostAssign({
          postID: post.id,
          boardId: post.boardId,
          userId: member.userId,
        });
      } catch (error) {
        console.error("Error assigning task:", error);
        toast.error("Failed to assign task");
        if (oldAssigned) {
          assignPostAction(post.id, oldAssigned);
        }
      }
    },
    [post.id, post.boardId, post.action?.assigned.value]
  );

  return (
    <CardFooter className="flex justify-between p-2">
      {post.type.value === PostType.action_item && (
        <>
          <Badge className="flex items-center justify-center">
            <p className="text-xs">{badgeText}</p>
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <Dialog>
                <DialogTrigger>
                  <AvatarIcon
                    userID={post.action?.assigned.value ?? ""}
                    triggers={(user, avatarContent) => (
                      <>
                        <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
                        <TooltipContent>
                          <p>{user?.name ?? "Unknown"}</p>
                        </TooltipContent>
                      </>
                    )}
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
      {post.type.value !== PostType.action_item && (
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

PostCardFooter.displayName = "PostCardFooter";

const cardTypes: Record<Post["type"], string> = {
  [PostType.went_well]: "bg-green-100",
  [PostType.to_improvement]: "bg-red-100",
  [PostType.to_discuss]: "bg-yellow-100",
  [PostType.action_item]: "bg-purple-100",
} as const satisfies Record<Post["type"], string>;

interface PostCardProps {
  post: PostSignal;
  viewOnly?: boolean;
  onDelete?: (id: Post["id"]) => void;
  onUpdate: (id: Post["id"], newContent: Post["content"]) => void;
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

  const { isAnonymous } = useAnonymousMode();
  const { addVotedPost, removeVotedPost, hasVoted } = useVotedPosts();

  const ref = useRef<HTMLDivElement>(null);

  const handleVote = useCallback(async () => {
    if (viewOnly) return;
    const isVoted = hasVoted(post.id);
    const voteAction = isVoted
      ? authenticatedDownVotePost
      : authenticatedUpVotePost;
    const voteCountAction = isVoted
      ? decrementPostVoteCount
      : incrementPostVoteCount;
    const votedPostAction = isVoted ? removeVotedPost : addVotedPost;

    try {
      await voteAction(post.id, userId, post.boardId);
      voteCountAction(post.id);
      votedPostAction(post.id);
    } catch (error) {
      console.error("Error while voting:", error);
      toast.error("Failed to vote.");
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
      const cleanup = draggable({
        element: postCardEl,
        getInitialData: () => ({
          id: post.id,
          originalType: post.type.value.valueOf(),
          boardId: post.boardId,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      });
      return () => cleanup();
    }
  }, [post, viewOnly]);

  const parsedContent = useComputed(() => (
    <Markdown
      components={{
        a: ({ href, children }) => (
          <CustomLink href={href || ""}>{children}</CustomLink>
        ),
      }}
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[[rehypeSanitize, { schema: defaultSchema }]]}
    >
      {post.content.value}
    </Markdown>
  ));

  return (
    <Card
      className={`w-full ${cardTypes[post.type.value]} ${
        isDragging ? "opacity-50" : ""
      } relative`}
      ref={ref}
    >
      {!viewOnly && onDelete && (
        <PostCardHeader post={post} onDelete={onDelete} onUpdate={onUpdate} />
      )}
      <CardContent className="px-3 py-1">
        <div
          className={`${
            isAnonymous ? "blur-sm select-none" : "select-text"
          } prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0`}
        >
          {parsedContent}
        </div>
      </CardContent>
      <PostCardFooter post={post} viewOnly={viewOnly} handleVote={handleVote} />
    </Card>
  );
}

PostCard.displayName = "PostCard";

export default PostCard;
