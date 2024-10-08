"use client";

import type { Post } from "@/db/schema";
import {
  addPost,
  updatePostContent,
  removePost,
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
      if (messageType === EVENT_TYPE.POST.ADD) {
        addPost(post);
      } else if (messageType === EVENT_TYPE.POST.UPDATE_CONTENT) {
        updatePostContent(post.id, post.content);
      } else if (messageType === EVENT_TYPE.POST.DELETE) {
        removePost(post.id);
      }
    }
  });

  return <></>;
}
