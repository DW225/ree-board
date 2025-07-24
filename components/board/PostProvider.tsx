/* eslint-disable drizzle/enforce-delete-with-where */
"use client";

import { useSetState } from "@/hooks/useSetState";
import { UpdatePostTypeAction } from "@/lib/actions/post/action";
import { PostType } from "@/lib/constants/post";
import { memberSignalInitial } from "@/lib/signal/memberSignals";
import {
  initializePostSignals,
  updatePostType,
} from "@/lib/signal/postSignals";
import type { MemberSignal } from "@/lib/types/member";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";
import { useEffectOnce } from "@/lib/utils/effect";
import type { FC, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  addVotedPost: (postId: Post["id"]) => void;
  removeVotedPost: (postId: Post["id"]) => void;
  hasVoted: (postId: Post["id"]) => boolean;
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
    (postId: Post["id"]) => {
      setVotedPosts((prev) => new Set(prev).add(postId));
    },
    [setVotedPosts]
  );

  const removeVotedPost = useCallback(
    (postId: Post["id"]) => {
      setVotedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    },
    [setVotedPosts]
  );

  const hasVoted = useCallback(
    (postId: Post["id"]) => votedPosts.has(postId),
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
  const dragMonitorRef = useRef<(() => void) | null>(null);
  const isDragInitialized = useRef(false);

  useEffectOnce(() => {
    initializePostSignals(initials.posts, initials.actions);
    memberSignalInitial(initials.members);
  });

  // Lazy load drag-and-drop functionality
  const initializeDragAndDrop = useCallback(async () => {
    if (isDragInitialized.current) return;

    try {
      const { monitorForElements } = await import(
        "@atlaskit/pragmatic-drag-and-drop/element/adapter"
      );

      const cleanup = monitorForElements({
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

      dragMonitorRef.current = cleanup;
      isDragInitialized.current = true;
    } catch (error) {
      console.error("Failed to initialize drag and drop:", error);
    }
  }, [boardId]);

  // Initialize drag-and-drop on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeDragAndDrop();
      // Remove listeners after first interaction
      document.removeEventListener("mousedown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("mousedown", handleFirstInteraction, {
      passive: true,
    });
    document.addEventListener("touchstart", handleFirstInteraction, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
      if (dragMonitorRef.current) {
        dragMonitorRef.current();
      }
    };
  }, [initializeDragAndDrop]);

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
