"use client";

import type { Post } from "@/db/schema";
import {
  addPost,
  updatePostContent,
  removePost,
  incrementPostVoteCount,
  decrementPostVoteCount,
} from "@/lib/signal/postSignals";
import { EVENT_TYPE } from "@/lib/utils/ably";
import { useChannel } from "ably/react";

interface PostChannelProps {
  boardId: string;
  userId: string;
}

export default function PostChannel({
  boardId,
  userId,
}: Readonly<PostChannelProps>) {
  useChannel(boardId, (message) => {
    if (message.extras.headers.user !== userId) {
      const messageType = message.name;
      const post: Post = JSON.parse(message.data);
      switch (messageType) {
        case EVENT_TYPE.POST.ADD:
          addPost(post);
          break;
        case EVENT_TYPE.POST.UPDATE_CONTENT:
          updatePostContent(post.id, post.content);
          break;
        case EVENT_TYPE.POST.DELETE:
          removePost(post.id);
          break;
        case EVENT_TYPE.POST.UPVOTE:
          incrementPostVoteCount(post.id);
          break;
        case EVENT_TYPE.POST.DOWNVOTE:
          decrementPostVoteCount(post.id);
          break;
      }
    }
  });

  return <></>;
}
