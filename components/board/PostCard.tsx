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
import {
  authedPostActionStateUpdate,
  authedPostAssign,
} from "@/lib/actions/task/action";
import {
  DownVotePostAction,
  UpVotePostAction,
} from "@/lib/actions/vote/action";
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import {
  assignTask,
  decrementPostVoteCount,
  incrementPostVoteCount,
  updatePostState,
} from "@/lib/signal/postSignals";
import type { MemberSignal } from "@/lib/types/member";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";
import type { User } from "@/lib/types/user";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { useComputed } from "@preact/signals-react";
import { MoreHorizontal, ThumbsUp } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import invariant from "tiny-invariant";
import { useAnonymousMode } from "./AnonymousModeProvider";
import MemberList from "./MemberList";
import { useVotedPosts } from "./PostProvider";

const MergePostDialog = dynamic(() => import("./MergePostDialog"), {
  ssr: false,
});

const MarkdownAnchor = ({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return href ? (
    <CustomLink href={href} {...props}>
      {children}
    </CustomLink>
  ) : (
    <span>{children}</span>
  );
};

// Create stable components object outside of component to prevent recreation on every render
const markdownComponents = {
  a: MarkdownAnchor,
};

interface PostCardHeaderProps {
  post: EnrichedPost;
  onDelete: (id: Post["id"]) => void;
  onUpdate: (
    id: Post["id"],
    originalContent: Post["content"],
    newContent: Post["content"]
  ) => void;
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

PostCardHeader.displayName = "PostCardHeader";

const STATUS_TEXT: Record<Task["state"], string> = {
  [TaskState.pending]: "To Do",
  [TaskState.inProgress]: "In Progress",
  [TaskState.completed]: "Done",
  [TaskState.cancelled]: "Cancelled",
} as const satisfies Record<Task["state"], string>;

interface PostCardFooterProps {
  post: EnrichedPost;
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

PostCardFooter.displayName = "PostCardFooter";

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
              originalType: post.type.valueOf(),
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
                // Can only drop posts, and not the same post on itselfＦ
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
  }, [post, viewOnly]);

  const handleMergeDialogClose = useCallback(() => {
    setShowMergeDialog(false);
    setSourcePostForMerge(null);
  }, []);

  const markdownRender = useMemo(
    () => (
      <Markdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeSanitize, { schema: defaultSchema }]]}
      >
        {post.content}
      </Markdown>
    ),
    [post.content]
  );

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
          <PostCardHeader post={post} onDelete={onDelete} onUpdate={onUpdate} />
        )}
        <CardContent className="px-3 py-1">
          <div
            className={`${
              isAnonymous ? "blur-sm select-none" : "select-text"
            } prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0`}
          >
            {markdownRender}
          </div>
        </CardContent>
        <PostCardFooter
          post={post}
          viewOnly={viewOnly}
          handleVote={handleVote}
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
