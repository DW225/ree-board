/* eslint-disable drizzle/enforce-delete-with-where */
"use client";

import { useSetState } from "@/hooks/useSetState";
import { UpdatePostTypeAction } from "@/lib/actions/post/action";
import { PostType } from "@/lib/constants/post";
import { memberSignalInitial } from "@/lib/signal/memberSignals";
import {
  initializePostSignals,
  postsSignal,
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
  useState,
} from "react";
import { toast } from "sonner";
import { z } from "zod";

const dragSourceSchema = z.object({
  type: z.literal("post"),
  id: z.string(),
  boardId: z.string(),
});
const columnSchema = z.object({ postType: z.enum(PostType) });

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
  resetVotedPosts: (postIds: string[]) => void;
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

  const resetVotedPosts = useCallback(
    (postIds: string[]) => setVotedPosts(() => new Set(postIds)),
    [setVotedPosts]
  );

  const value = useMemo(
    () => ({
      votedPosts,
      addVotedPost,
      removeVotedPost,
      hasVoted,
      resetVotedPosts,
    }),
    [votedPosts, addVotedPost, removeVotedPost, hasVoted, resetVotedPosts]
  );

  return (
    <VotedPostsContext.Provider value={value}>
      {children}
    </VotedPostsContext.Provider>
  );
};

export interface BoardInitialData {
  posts: Post[];
  members: MemberSignal[];
  votedPosts: string[];
  actions: Task[];
}

interface PostProviderProps {
  children: ReactNode;
  initials: BoardInitialData;
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
    let cancelled = false;
    let initializing = false;
    let cleanup: (() => void) | undefined;
    const pendingPosts = new Set<string>();

    const saveMove = async (previous: Post, destinationType: PostType) => {
      const postId = previous.id;
      try {
        await UpdatePostTypeAction(postId, boardId, destinationType);
      } catch (error) {
        console.error("Failed to move post:", error);
        toast.error("Failed to move post");
        // Revert only this field; retain newer content and type changes.
        if (
          postsSignal.value.find((post) => post.id === postId)?.type ===
          destinationType
        ) {
          updatePostType(postId, previous.type);
        }
      } finally {
        pendingPosts.delete(postId);
      }
    };

    const initializeDragAndDrop = async () => {
      if (initializing || cleanup) return;
      initializing = true;
      try {
        const { monitorForElements } =
          await import("@atlaskit/pragmatic-drag-and-drop/element/adapter");
        if (cancelled) return;

        cleanup = monitorForElements({
          onDrop({ location, source }) {
            if (location.current.dropTargets.length !== 1) return;
            const parsedSource = dragSourceSchema.safeParse(source.data);
            const destination = columnSchema.safeParse(
              location.current.dropTargets[0].data
            );
            if (!parsedSource.success || !destination.success) return;
            const { id: postId, boardId: sourceBoardId } = parsedSource.data;
            if (sourceBoardId !== boardId || pendingPosts.has(postId)) return;
            const previous = postsSignal.value.find(
              (post) => post.id === postId && post.boardId === boardId
            );
            if (!previous || previous.type === destination.data.postType)
              return;

            pendingPosts.add(postId);
            updatePostType(postId, destination.data.postType);
            void saveMove(previous, destination.data.postType);
          },
        });
        document.removeEventListener("mousedown", handleFirstInteraction);
        document.removeEventListener("touchstart", handleFirstInteraction);
      } catch (error) {
        console.error("Failed to initialize drag and drop:", error);
      } finally {
        initializing = false;
      }
    };
    const handleFirstInteraction = () => {
      void initializeDragAndDrop();
    };
    document.addEventListener("mousedown", handleFirstInteraction, {
      passive: true,
    });
    document.addEventListener("touchstart", handleFirstInteraction, {
      passive: true,
    });
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
      cleanup?.();
    };
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
