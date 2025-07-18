/* eslint-disable drizzle/enforce-delete-with-where */
"use client";

import { useSetState } from "@/hooks/useSetState";
import { UpdatePostTypeAction } from "@/lib/actions/post/action";
import { PostType } from "@/lib/constants/post";
import { memberSignalInitial } from "@/lib/signal/memberSingals";
import {
  initializePostSignals,
  updatePostType,
} from "@/lib/signal/postSignals";
import type { MemberSignal } from "@/lib/types/member";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";
import { useEffectOnce } from "@/lib/utils/effect";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { FC, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import invariant from "tiny-invariant";

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
  addVotedPost: (postID: Post["id"]) => void;
  removeVotedPost: (postID: Post["id"]) => void;
  hasVoted: (postID: Post["id"]) => boolean;
}

const VotedPostsContext = createContext<VotedPostsContextType | undefined>(
  undefined
);

interface VotedPostsProviderProps {
  children: ReactNode;
  initial: {
    votedPosts: string[];
  };
}

export const VotedPostsProvider: FC<VotedPostsProviderProps> = ({
  children,
  initial,
}) => {
  const [votedPosts, setVotedPosts] = useSetState<string>(
    new Set(initial.votedPosts)
  );

  const addVotedPost = useCallback(
    (postID: Post["id"]) => {
      setVotedPosts((prev) => new Set(prev).add(postID));
    },
    [setVotedPosts]
  );

  const removeVotedPost = useCallback(
    (postID: Post["id"]) => {
      setVotedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postID);
        return newSet;
      });
    },
    [setVotedPosts]
  );

  const hasVoted = useCallback(
    (postID: Post["id"]) => votedPosts.has(postID),
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
  children: ReactNode;
  initials: {
    posts: Post[];
    members: MemberSignal[];
    votedPosts: string[];
    actions: Task[];
  };
  boardId: string;
}

const PostProvider: FC<PostProviderProps> = ({
  children,
  initials,
  boardId,
}) => {
  useEffectOnce(() => {
    initializePostSignals(initials.posts, initials.actions);
    memberSignalInitial(initials.members);
  });

  useEffect(() => {
    return monitorForElements({
      async onDrop(args) {
        const { location, source } = args;
        if (!location.current.dropTargets.length) {
          return;
        }
        const postId = source.data.id;
        invariant(typeof postId === "string");
        const originalType = source.data.originalType;
        invariant(typeof originalType === "number");

        if (location.current.dropTargets.length === 1) {
          const [destinationColumnRecord] = location.current.dropTargets;
          const destinationPostType = destinationColumnRecord.data.postType;
          invariant(typeof destinationPostType === "number");

          const postTypeKey = Object.keys(PostType)[
            Object.values(PostType).indexOf(destinationPostType)
          ] as keyof typeof PostType;

          updatePostType(postId, PostType[postTypeKey]);

          await UpdatePostTypeAction(postId, boardId, PostType[postTypeKey]);
        }
      },
    });
  }, [boardId]);

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

export default PostProvider;
