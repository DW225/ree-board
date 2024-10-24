"use client";

import { Realtime } from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";

interface RTLProviderProps {
  boardId: string;
  children: React.ReactNode;
}

export default function RTLProvider({
  boardId,
  children,
}: Readonly<RTLProviderProps>) {
  const client = new Realtime({
    authUrl: "/api/ably/token",
    authMethod: "POST",
  });

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={boardId}>{children}</ChannelProvider>
    </AblyProvider>
  );
}
