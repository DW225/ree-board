"use client";

import { BaseRealtime, FetchRequest, WebSocketTransport } from "ably/modular";
import { AblyProvider, ChannelProvider } from "ably/react";
import { useMemo } from "react";

interface RTLProviderProps {
  boardId: string;
  children: React.ReactNode;
}

export default function RTLProvider({
  boardId,
  children,
}: Readonly<RTLProviderProps>) {
  const client = useMemo(
    () =>
      new BaseRealtime({
        authUrl: "/api/ably/token",
        authMethod: "POST",
        plugins: { FetchRequest, WebSocketTransport },
      }),
    []
  );

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={boardId}>{children}</ChannelProvider>
    </AblyProvider>
  );
}
