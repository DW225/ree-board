"use client";

import CustomLink from "@/components/common/Link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { Signal } from "@preact/signals-react";
import {
  batch,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals-react";
import MD5 from "crypto-js/md5";
import { MoreHorizontal, ThumbsUp } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { useUnmount } from "react-use";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import invariant from "tiny-invariant";
import { useAnonymousMode } from "./AnonymousModeProvider";
import MemberList from "./MemberList";
import type { MemberInfo } from "./MemberManageModalComponent";
import { useVotedPosts } from "./PostProvider";

const EditDialog = dynamic(() => import("./EditDialog"), { ssr: false });

interface PostCardHeaderProps {
  post: PostSignal;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newContent: string) => void;
}

const PostCardHeader = ({ post, onDelete, onUpdate }: PostCardHeaderProps) => {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleEdit = () => {
    if (onUpdate) {
      onUpdate(post.id, message);
    }
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus: ActionState) => {
    if (post.action?.state.value === newStatus) return;

    const oldState = post.action?.state.value;
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
  };

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
};

const STATUS_TEXT = {
  [ActionState.pending]: "To Do",
  [ActionState.inProgress]: "In Progress",
  [ActionState.completed]: "Done",
  [ActionState.cancelled]: "Cancelled",
} as const;

interface PostCardFooterProps {
  post: PostSignal;
  viewOnly: boolean;
  handleVote: () => Promise<void>;
}

const PostCardFooter = ({
  post,
  viewOnly,
  handleVote,
}: PostCardFooterProps) => {
  const { hasVoted } = useVotedPosts();
  const abortControllerRef = useRef(new AbortController());

  const assignedUser = useSignal<{
    name: Signal<string>;
    email: Signal<string>;
  }>({
    name: useSignal(""),
    email: useSignal(""),
  });

  const badgeText = useComputed(() => {
    return STATUS_TEXT[post.action?.state.value ?? ActionState.pending];
  });

  const handleAssign = async (member: MemberInfo) => {
    const oldAssigned = post.action?.assigned.value;
    try {
      assignPostAction(post.id, member.userId);
      await authedPostAssign({
        postId: post.id,
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
  };

  const fetchUserInfo = async (assigned: string) => {
    try {
      const data = await fetch(`/api/user/${assigned}`, {
        signal: abortControllerRef.current.signal,
      });
      const {
        user: { name, email },
      }: {
        user: {
          id: string;
          name: string;
          kinde_id: string;
          email: string;
          createdAt: Date;
        };
      } = await data.json();
      if (!data.ok) {
        throw new Error("Failed to fetch user info");
      }

      batch(() => {
        assignedUser.value.name.value = name;
        assignedUser.value.email.value = email;
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted");
      } else {
        console.error("Error fetching user info:", error);
      }
    }
  };

  useSignalEffect(() => {
    if (
      post.type.value === PostType.action_item &&
      post.action?.assigned.value
    ) {
      const assignedUserId = post.action.assigned.value;
      fetchUserInfo(assignedUserId);
    }
  });

  useUnmount(() => {
    abortControllerRef.current.abort();
  });

  return (
    <CardFooter className="flex justify-between p-2">
      {post.type.value === PostType.action_item && (
        <>
          <Badge className="flex items-center justify-center">
            <p className="text-xs">{badgeText}</p>
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Dialog>
                  <DialogTrigger asChild>
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`https://www.gravatar.com/avatar/${MD5(
                          assignedUser.value.email.value
                        )}?d=404&s=48`}
                        alt={assignedUser.value.name.value}
                      />
                      <AvatarFallback>{assignedUser.value.name}</AvatarFallback>
                    </Avatar>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Assign Task</DialogTitle>
                    </DialogHeader>
                    <MemberList viewOnly={true} onAssign={handleAssign} />
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p>{assignedUser.value.name}</p>
              </TooltipContent>
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
};

interface PostCardProps {
  post: PostSignal;
  viewOnly?: boolean;
  onDelete?: (id: string) => void;
  onUpdate: (id: string, newContent: string) => void;
  userId: string;
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

  const cardTypes = {
    [PostType.went_well]: "bg-green-100",
    [PostType.to_improvement]: "bg-red-100",
    [PostType.to_discuss]: "bg-yellow-100",
    [PostType.action_item]: "bg-purple-100",
  };

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
  }, [viewOnly, hasVoted, post, userId, addVotedPost, removeVotedPost]);

  useEffect(() => {
    if (!viewOnly) {
      const postCardEl = ref.current;
      invariant(postCardEl, "postCardEl is null");
      return draggable({
        element: postCardEl,
        getInitialData: () => ({
          id: post.id,
          originalType: post.type.value.valueOf(),
          boardId: post.boardId,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      });
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

export default PostCard;
