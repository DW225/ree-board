"use client";

import type { Post } from "@/db/schema";
import { memberSignalInitial } from "@/lib/signal/memberSingals";
import { postSignalInitial } from "@/lib/signal/postSignals";
import { useEffectOnce } from "@/lib/utils/effect";
import * as Ably from "ably";
import { AblyProvider } from "ably/react";
import React, { createContext, useContext, useMemo, useState } from "react";
import type { MemberInfo } from "./MemberManageModalComponent";

interface AddPostFormContextType {
  openFormId: string | null;
  setOpenFormId: (id: string | null) => void;
}

interface PostProviderProps {
  children: React.ReactNode;
  initialPosts: Post[];
  initialMembers: MemberInfo[];
}

const AddPostFormContext = createContext<AddPostFormContextType | undefined>(
  undefined
);

export const PostProvider: React.FC<PostProviderProps> = ({
  children,
  initialPosts,
  initialMembers,
}) => {
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const client = new Ably.Realtime({
    authUrl: "/api/ably/token",
    authMethod: "GET",
  });

  useEffectOnce(() => {
    postSignalInitial(initialPosts);
    memberSignalInitial(initialMembers);
  });

  return (
    <AblyProvider client={client}>
      <AddPostFormContext.Provider
        value={useMemo(
          () => ({
            openFormId,
            setOpenFormId,
          }),
          [openFormId, setOpenFormId]
        )}
      >
        {children}
      </AddPostFormContext.Provider>
    </AblyProvider>
  );
};

export const useAddPostForm = () => {
  const context = useContext(AddPostFormContext);
  if (context === undefined) {
    throw new Error("useAddPostForm must be used within a PostProvider");
  }
  return context;
};
