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
import { decrementPostVoteCount, incrementPostVoteCount, type PostSignal } from "@/lib/signal/postSignals";
import {
  HandThumbUpIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { useAnonymousMode } from "./AnonymousModeProvider";
import { useVotedPosts } from "./PostProvider";
import { authenticatedDownVotePost, authenticatedUpVotePost } from "@/lib/actions/authenticatedActions";
import { toast } from "@/lib/signal/toastSignals";

interface PostCardProps {
  post: PostSignal;
  viewOnly?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, newContent: string) => void;
  userId: string;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  viewOnly = false,
  onDelete,
  onUpdate,
  userId,
}) => {
  const [message, setMessage] = useState(post.content.value);
  const [isEditing, setIsEditing] = useState(false);

  const { isAnonymous } = useAnonymousMode();
  const { addVotedPost, removeVotedPost, hasVoted } = useVotedPosts();

  const cardTypes = {
    [PostType.went_well]: "bg-green-100",
    [PostType.to_improvement]: "bg-red-100",
    [PostType.to_discuss]: "bg-yellow-100",
    [PostType.action_item]: "bg-purple-100",
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleVote = async () => {
    if (viewOnly) return;

    const isVoted = hasVoted(post.id);
    const voteAction = isVoted ? authenticatedDownVotePost : authenticatedUpVotePost;
    const voteCountAction = isVoted ? decrementPostVoteCount : incrementPostVoteCount;
    const votedPostAction = isVoted ? removeVotedPost : addVotedPost;

    try {
      await voteAction(post.id, userId, post.boardId);
      voteCountAction(post.id);
      votedPostAction(post.id);
    } catch (error) {
      console.error('Error while voting:', error);
      toast.error("Failed to vote.");
    }
  };

  const handleEdit = () => {
    if (onUpdate) {
      onUpdate(post.id, message);
    }
    setIsEditing(false);
  };

  return (
    <Card className={`w-full ${cardTypes[post.type.value]} relative`}>
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
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
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
                  value={post.content.value}
                  onChange={handleChange}
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
};

export default PostCard;
