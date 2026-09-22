"use client";

import { localMessageSchema } from "@/lib/realtime/localMessage";
import type { LocalMessage } from "@/lib/realtime/localMessage";
import { useEffect, useState } from "react";

export function LocalPostChannel({
  boardId,
  onMessage,
}: {
  boardId: string;
  onMessage: (message: LocalMessage) => void;
}) {
  const [status, setStatus] = useState("Connecting");
  useEffect(() => {
    const stream = new EventSource(
      `/api/e2e/realtime/${encodeURIComponent(boardId)}`
    );
    stream.addEventListener("ready", () => {
      setStatus("Connected");
    });
    stream.onerror = () => {
      setStatus("Reconnecting");
    };
    stream.onmessage = (event) => {
      try {
        const message = localMessageSchema.safeParse(JSON.parse(event.data));
        if (message.success) onMessage(message.data);
      } catch {
        /* Ignore malformed inbound events. */
      }
    };
    return () => {
      stream.close();
    };
  }, [boardId, onMessage]);
  return (
    <span className="sr-only" role="status" data-testid="local-realtime-status">
      {status}
    </span>
  );
}
