"use client";

import type { Post } from "@/db/schema";
import { addPost, updatePost, removePost } from "@/lib/signal/postSignals";
import { useChannel } from "ably/react";

interface PostChannelProps {
  boardId: string;
  userId: string;
}

export default function PostChannel({ boardId, userId }: Readonly<PostChannelProps>) {
  useChannel(boardId, (message) => {
    if (message.extras.headers.user !== userId) {
      const messageType = message.name;
      const post: Post = JSON.parse(message.data);
      if (messageType === "ADD") {
        addPost(post);
      } else if (messageType === "UPDATE") {
        updatePost({ id: post.id, content: post.content });
      } else if (messageType === "DELETE") {
        removePost(post.id);
      }
    }
  });

  return <></>;
}
