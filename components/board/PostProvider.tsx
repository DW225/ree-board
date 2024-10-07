"use client";

import type { Post } from "@/db/schema";
import { memberSignalInitial } from "@/lib/signal/memberSingals";
import { postSignalInitial } from "@/lib/signal/postSignals";
import { useEffectOnce } from "@/lib/utils/effect";
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

  useEffectOnce(() => {
    postSignalInitial(initialPosts);
    memberSignalInitial(initialMembers);
  });

  return (
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
  );
};

export const useAddPostForm = () => {
  const context = useContext(AddPostFormContext);
  if (context === undefined) {
    throw new Error("useAddPostForm must be used within a PostProvider");
  }
  return context;
};
