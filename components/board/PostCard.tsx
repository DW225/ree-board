"use client";

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
import type { Action, Post, User } from "@/db/schema";
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
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useComputed } from "@preact/signals-react";
import { MoreHorizontal, ThumbsUp } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import invariant from "tiny-invariant";
import { AvatarIconWithFallback } from "../common/AvatarWithFallback";
import { useAnonymousMode } from "./AnonymousModeProvider";
import MemberList from "./MemberList";
import type { MemberInfo } from "./MemberManageModalComponent";
import { useVotedPosts } from "./PostProvider";

const EditDialog = dynamic(() => import("./EditDialog"), { ssr: false });

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

  return (
    <CardHeader className="flex flex-row items-center justify-end space-y-0 p-2">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
          <EditDialog
            isOpen={isEditing}
            onOpenChange={setIsEditing}
            content={message}
            onContentChange={setMessage}
            onSave={handleEdit}
            variant="edit"
            trigger={
              <DropdownMenuItem
                onClick={(e) => {
                  setIsEditing(true);
                  setMessage(post.content.value);
                  e.preventDefault();
                }}
                className="text-blue-500 focus:text-blue-500 focus:bg-blue-50"
              >
                Edit
              </DropdownMenuItem>
            }
          />
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
    async (member: MemberInfo) => {
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
          <Dialog>
            <DialogTrigger asChild>
              <AvatarIconWithFallback
                userID={post.action?.assigned.value ?? ""}
              />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Assign Task</DialogTitle>
              </DialogHeader>
              <MemberList viewOnly={true} onAssign={handleAssign} />
            </DialogContent>
          </Dialog>
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

const PostCard = memo(function PostCard({
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
        <Markdown
          className={`${
            isAnonymous ? "blur-sm select-none" : "select-text"
          } prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0`}
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
      </CardContent>
      <PostCardFooter post={post} viewOnly={viewOnly} handleVote={handleVote} />
    </Card>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;
