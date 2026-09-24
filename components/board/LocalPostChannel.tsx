"use client";

import { localMessageSchema } from "@/lib/realtime/localMessage";
import type { LocalMessage } from "@/lib/realtime/localMessage";
import { membersSignal, memberSignalInitial } from "@/lib/signal/memberSignals";
import {
  initializePostSignals,
  postsSignal,
  tasksSignal,
  votesSignal,
} from "@/lib/signal/postSignals";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVotedPosts } from "./PostProvider";
import type { BoardInitialData } from "./PostProvider";

const boardSignals = [postsSignal, tasksSignal, votesSignal, membersSignal];

export function LocalPostChannel({
  boardId,
  onMessage,
  initials,
}: {
  readonly boardId: string;
  readonly initials: BoardInitialData;
  readonly onMessage: (message: LocalMessage) => void;
}) {
  const [status, setStatus] = useState("Connecting");
  const router = useRouter();
  const { resetVotedPosts } = useVotedPosts();
  const connected = useRef(false);
  const snapshot = useRef<{ values: unknown[]; invalidated: boolean } | null>(
    null
  );
  const refresh = useCallback(() => {
    if (snapshot.current) {
      snapshot.current.invalidated = true;
      return;
    }
    snapshot.current = {
      values: boardSignals.map((signal) => signal.peek()),
      invalidated: false,
    };
    setStatus("Syncing");
    router.refresh();
  }, [router]);

  useEffect(() => {
    const pending = snapshot.current;
    if (!pending) return;
    snapshot.current = null;
    if (!connected.current) return;
    // Do not replace an edit or event received while the server was reading.
    if (
      pending.invalidated ||
      pending.values.some(
        (value, index) => value !== boardSignals[index].peek()
      )
    ) {
      refresh();
      return;
    }
    initializePostSignals(initials.posts, initials.actions);
    memberSignalInitial(initials.members);
    resetVotedPosts(initials.votedPosts);
    setStatus("Connected");
  }, [initials, refresh, resetVotedPosts]);
  useEffect(() => {
    const stream = new EventSource(
      `/api/e2e/realtime/${encodeURIComponent(boardId)}`
    );
    // Re-read committed state on every connection; the local relay has no replay.
    stream.addEventListener("ready", () => {
      connected.current = true;
      refresh();
    });
    stream.onerror = () => {
      connected.current = false;
      if (snapshot.current) snapshot.current.invalidated = true;
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
      connected.current = false;
      snapshot.current = null;
      stream.close();
    };
  }, [boardId, onMessage, refresh]);
  return (
    <output className="sr-only" data-testid="local-realtime-status">
      {status}
    </output>
  );
}
