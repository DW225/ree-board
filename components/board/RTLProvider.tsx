"use client";

import { BaseRealtime, FetchRequest, WebSocketTransport } from "ably/modular";
import { AblyProvider, ChannelProvider } from "ably/react";

interface RTLProviderProps {
  boardId: string;
  children: React.ReactNode;
}

export default function RTLProvider({
  boardId,
  children,
}: Readonly<RTLProviderProps>) {
  const client = new BaseRealtime({
    authUrl: "/api/ably/token",
    authMethod: "POST",
    plugins: { FetchRequest, WebSocketTransport },
    disconnectedRetryTimeout: 15000,
  });

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={boardId}>{children}</ChannelProvider>
    </AblyProvider>
  );
}
