/* eslint-disable drizzle/enforce-delete-with-where */
"use client";

import type { Post } from "@/db/schema";
import { memberSignalInitial } from "@/lib/signal/memberSingals";
import { postSignalInitial } from "@/lib/signal/postSignals";
import { useEffectOnce } from "@/lib/utils/effect";
import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { MemberInfo } from "./MemberManageModalComponent";
import { useSetState } from "@/hooks/useSetState";

interface AddPostFormContextType {
  openFormId: string | null;
  setOpenFormId: (id: string | null) => void;
}

const AddPostFormContext = createContext<AddPostFormContextType | undefined>(
  undefined
);

const AddPostFormContextProvider = ({
  children,
}: Readonly<{ children: ReactNode }>) => {
  const [openFormId, setOpenFormId] = useState<string | null>(null);
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

interface VotedPostsContextType {
  votedPosts: Set<string>;
  addVotedPost: (postId: string) => void;
  removeVotedPost: (postId: string) => void;
  hasVoted: (postId: string) => boolean;
}

const VotedPostsContext = createContext<VotedPostsContextType | undefined>(
  undefined
);

interface VotedPostsProviderProps {
  children: React.ReactNode;
  initial: {
    votedPosts: string[];
  };
}

export const VotedPostsProvider: React.FC<VotedPostsProviderProps> = ({
  children,
  initial,
}) => {
  const [votedPosts, setVotedPosts] = useSetState<string>(
    new Set(initial.votedPosts)
  );

  const addVotedPost = useCallback(
    (postId: string) => {
      setVotedPosts((prev) => new Set(prev).add(postId));
    },
    [setVotedPosts]
  );

  const removeVotedPost = useCallback(
    (postId: string) => {
      setVotedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    },
    [setVotedPosts]
  );

  const hasVoted = useCallback(
    (postId: string) => votedPosts.has(postId),
    [votedPosts]
  );

  const value = useMemo(
    () => ({
      votedPosts,
      addVotedPost,
      removeVotedPost,
      hasVoted,
    }),
    [votedPosts, addVotedPost, removeVotedPost, hasVoted]
  );

  return (
    <VotedPostsContext.Provider value={value}>
      {children}
    </VotedPostsContext.Provider>
  );
};

interface PostProviderProps {
  children: React.ReactNode;
  initials: {
    posts: Post[];
    members: MemberInfo[];
    votedPosts: string[];
  };
}

export const PostProvider: React.FC<PostProviderProps> = ({
  children,
  initials,
}) => {
  useEffectOnce(() => {
    postSignalInitial(initials.posts);
    memberSignalInitial(initials.members);
  });

  return (
    <VotedPostsProvider initial={{ votedPosts: initials.votedPosts }}>
      <AddPostFormContextProvider>{children}</AddPostFormContextProvider>
    </VotedPostsProvider>
  );
};

export const useAddPostForm = () => {
  const context = useContext(AddPostFormContext);
  if (context === undefined) {
    throw new Error("useAddPostForm must be used within a PostProvider");
  }
  return context;
};

export const useVotedPosts = () => {
  const context = useContext(VotedPostsContext);
  if (context === undefined) {
    throw new Error("useVotedPosts must be used within a VotedPostsProvider");
  }
  return context;
};
