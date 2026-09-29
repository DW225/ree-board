"use client";

import {
  createPostMessageProcessor,
  createTaskMessageProcessor,
} from "@/lib/realtime/messageProcessors";
import { EVENT_PREFIX } from "@/lib/utils/ably";
import { useChannel } from "ably/react";
import { useMemo } from "react";
import { LocalPostChannel } from "./LocalPostChannel";
import type { BoardInitialData } from "./PostProvider";

interface PostChannelProps {
  boardId: string;
  userId: string;
}

interface BoardMessage {
  name?: string;
  data?: unknown;
  extras?: { headers?: { user?: string | null } };
}

function useMessageDispatcher(userId: string) {
  const postProcessor = useMemo(() => createPostMessageProcessor(), []);
  const taskProcessor = useMemo(() => createTaskMessageProcessor(), []);
  return useMemo(
    () => (message: BoardMessage) => {
      const messageType = message.name;
      if (messageType === undefined) return;
      if (
        message.extras?.headers?.user !== userId &&
        messageType.startsWith(EVENT_PREFIX.POST)
      ) {
        postProcessor(messageType, message.data, userId);
      }
      if (messageType.startsWith(EVENT_PREFIX.ACTION)) {
        taskProcessor(messageType, message.data, userId);
      }
    },
    [postProcessor, taskProcessor, userId]
  );
}

export function AblyPostChannel({
  boardId,
  userId,
}: Readonly<PostChannelProps>) {
  const dispatch = useMessageDispatcher(userId);
  useChannel(`board:${boardId}`, dispatch);
  return null;
}

function LocalBoardMessages({
  boardId,
  userId,
  initials,
}: Readonly<PostChannelProps & { initials: BoardInitialData }>) {
  const dispatch = useMessageDispatcher(userId);
  return (
    <LocalPostChannel
      boardId={boardId}
      onMessage={dispatch}
      initials={initials}
    />
  );
}

export default function PostChannel(
  props: Readonly<PostChannelProps & { initials: BoardInitialData }>
) {
  return process.env.NEXT_PUBLIC_E2E_RUN_ID &&
    process.env.NEXT_PUBLIC_E2E_REALTIME_MODE !== "ably" ? (
    <LocalBoardMessages {...props} />
  ) : (
    <AblyPostChannel {...props} />
  );
}
