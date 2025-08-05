"use client";

import {
  createPostMessageProcessor,
  createTaskMessageProcessor,
} from "@/lib/realtime/messageProcessors";
import { EVENT_PREFIX } from "@/lib/utils/ably";
import { useChannel } from "ably/react";
import { useMemo } from "react";

interface PostChannelProps {
  boardId: string;
  userId: string;
}

export default function PostChannel({
  boardId,
  userId,
}: Readonly<PostChannelProps>) {
  // Create message processors with memoization for performance
  const postProcessor = useMemo(() => createPostMessageProcessor(), []);
  const taskProcessor = useMemo(() => createTaskMessageProcessor(), []);

  useChannel(boardId, (message) => {
    const messageType = message.name;
    if (messageType === undefined) return;

    if (message.extras.headers.user !== userId) {
      if (messageType.startsWith(EVENT_PREFIX.POST)) {
        // Process post updates and creations using new processor
        postProcessor(messageType, message.data, userId);
      } else if (messageType.startsWith(EVENT_PREFIX.MEMBER)) {
        // Process member updates and creations
        // TODO: Add member message processor when needed
      }
    }

    if (messageType.startsWith(EVENT_PREFIX.ACTION)) {
      // Process task updates and creations using new processor
      taskProcessor(messageType, message.data, userId);
    }
  });

  return <></>;
}
