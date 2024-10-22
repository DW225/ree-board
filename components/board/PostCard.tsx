"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PostType } from "@/db/schema";
import {
  authenticatedDownVotePost,
  authenticatedUpVotePost,
} from "@/lib/actions/authenticatedActions";
import {
  decrementPostVoteCount,
  incrementPostVoteCount,
  type PostSignal,
} from "@/lib/signal/postSignals";
import { toast } from "@/lib/signal/toastSignals";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  HandThumbUpIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { memo, useEffect, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useAnonymousMode } from "./AnonymousModeProvider";
import { useVotedPosts } from "./PostProvider";

interface PostCardProps {
  post: PostSignal;
  viewOnly?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, newContent: string) => void;
  userId: string;
}

const PostCard = memo(function PostCard({
  post,
  viewOnly = false,
  onDelete,
  onUpdate,
  userId,
}: Readonly<PostCardProps>) {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
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

  const handleVote = async () => {
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
  };

  const handleEdit = () => {
    if (onUpdate) {
      onUpdate(post.id, message);
    }
    setIsEditing(false);
  };

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
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => onDelete(post.id)}
        >
          <XMarkIcon className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="pt-6 p-5">
        <p
          className={`whitespace-pre-wrap text-balance break-words pt-1.5 ${
            isAnonymous ? "blur-sm select-none" : ""
          }`}
        >
          {post.content}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end items-center p-3">
        <div className="flex items-center space-x-2">
          {!viewOnly && (
            <Dialog
              open={isEditing}
              onOpenChange={(open) => {
                setIsEditing(open);
                setMessage(post.content.value);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Message</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={handleEdit}>Save</Button>
              </DialogContent>
            </Dialog>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center ${
              hasVoted(post.id) ? "text-blue-600" : "text-gray-500"
            } ${viewOnly ? "cursor-default" : ""}`}
            onClick={handleVote}
          >
            <HandThumbUpIcon className="h-4 w-4 mr-2" />
            <span>{post.voteCount}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

export default PostCard;
