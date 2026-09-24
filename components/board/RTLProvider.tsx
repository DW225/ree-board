"use client";

import { Realtime } from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";

interface RTLProviderProps {
  boardId: string;
  children: ReactNode;
}

function AblyRTLProvider({ boardId, children }: Readonly<RTLProviderProps>) {
  const client = useMemo(
    () =>
      new Realtime({
        authUrl: "/api/ably/token",
        authMethod: "POST",
        authParams: { boardId },
        autoConnect: false,
      }),
    [boardId]
  );
  useEffect(() => {
    client.connect();
    return () => client.close();
  }, [client]);

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={`board:${boardId}`}>
        {children}
      </ChannelProvider>
    </AblyProvider>
  );
}

export default function RTLProvider(props: Readonly<RTLProviderProps>) {
  if (
    process.env.NEXT_PUBLIC_E2E_RUN_ID &&
    process.env.NEXT_PUBLIC_E2E_REALTIME_MODE !== "ably"
  )
    return props.children;
  return <AblyRTLProvider {...props} />;
}
