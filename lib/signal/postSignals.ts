import { TaskState } from "@/lib/constants/task";
import type { Post } from "@/lib/types/post";
import type { SortCriterion, SortDirection } from "@/lib/types/sort";
import type { NewTask, Task } from "@/lib/types/task";
import { batch, computed, signal } from "@preact/signals-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

// Type for enriched posts (posts with tasks and updated vote counts)
export type EnrichedPost = Post & {
  voteCount: number;
  task?: Task;
};

// Core data signals - single source of truth
export const postsSignal = signal<Post[]>([]);
export const tasksSignal = signal<Record<string, Task>>({});
export const votesSignal = signal<Record<string, number>>({});

// UI state signals
export const sortCriteriaSignal = signal<{
  criterion: SortCriterion;
  direction: SortDirection;
}>({
  criterion: "creation-time",
  direction: "desc",
});

// Computed signals for derived state
export const enrichedPostsSignal = computed(() => {
  const posts = postsSignal.value;
  const tasks = tasksSignal.value;
  const votes = votesSignal.value;

  return posts.map((post) => ({
    ...post,
    voteCount: votes[post.id] ?? post.voteCount,
    task: tasks[post.id],
  }));
});

export const sortedPostsSignal = computed(() => {
  const posts = enrichedPostsSignal.value;
  const { criterion, direction } = sortCriteriaSignal.value;

  const sortedPosts = [...posts].sort((a, b) => {
    let comparison = 0;

    switch (criterion) {
      case "creation-time": {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0;
        }
        comparison = dateA.getTime() - dateB.getTime();
        break;
      }
      case "vote-count":
        comparison = a.voteCount - b.voteCount;
        break;
      default:
        break;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sortedPosts;
});

export const postsByTypeSignal = computed(() => {
  const posts = enrichedPostsSignal.value;
  return posts.reduce((acc, post) => {
    if (!acc[post.type]) {
      acc[post.type] = [];
    }
    acc[post.type].push(post);
    return acc;
  }, {} as Record<Post["type"], typeof posts>);
});

// Initialization function
export const initializePostSignals = (posts: Post[], tasks: Task[]) => {
  batch(() => {
    postsSignal.value = posts;

    // Convert tasks array to record for efficient lookup
    const taskRecord: Record<string, Task> = {};
    tasks.forEach((task) => {
      taskRecord[task.postId] = task;
    });
    tasksSignal.value = taskRecord;

    // Initialize votes from posts
    const voteRecord: Record<string, number> = {};
    posts.forEach((post) => {
      voteRecord[post.id] = post.voteCount;
    });
    votesSignal.value = voteRecord;
  });
};

// Action creators for post operations
export const addPost = (newPost: Post) => {
  batch(() => {
    postsSignal.value = [...postsSignal.value, newPost];
    votesSignal.value = {
      ...votesSignal.value,
      [newPost.id]: newPost.voteCount,
    };
  });
};

export const removePost = (postId: Post["id"]) => {
  batch(() => {
    postsSignal.value = postsSignal.value.filter((post) => post.id !== postId);

    // Clean up related data
    const newVotes = { ...votesSignal.value };
    delete newVotes[postId];
    votesSignal.value = newVotes;

    const newTasks = { ...tasksSignal.value };
    delete newTasks[postId];
    tasksSignal.value = newTasks;
  });
};

export const updatePostContent = (
  postId: Post["id"],
  newContent: Post["content"]
) => {
  postsSignal.value = postsSignal.value.map((post) =>
    post.id === postId ? { ...post, content: newContent } : post
  );
};

export const updatePostType = (postId: Post["id"], newType: Post["type"]) => {
  postsSignal.value = postsSignal.value.map((post) =>
    post.id === postId ? { ...post, type: newType } : post
  );
};

// Vote operations with optimistic updates
export const incrementPostVoteCount = (postId: Post["id"]) => {
  const currentVotes = votesSignal.value;
  const currentCount = currentVotes[postId] ?? 0;

  votesSignal.value = {
    ...currentVotes,
    [postId]: currentCount + 1,
  };
};

export const decrementPostVoteCount = (postId: Post["id"]) => {
  const currentVotes = votesSignal.value;
  const currentCount = currentVotes[postId] ?? 0;

  if (currentCount > 0) {
    votesSignal.value = {
      ...currentVotes,
      [postId]: currentCount - 1,
    };
  }
};

// Task operations
export const addPostTask = (task: NewTask) => {
  const newTask: Task = {
    id: task.id,
    postId: task.postId,
    boardId: task.boardId,
    userId: task.userId ?? null,
    state: task.state ?? TaskState.pending,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tasksSignal.value = {
    ...tasksSignal.value,
    [task.postId]: newTask,
  };
};

export const assignTask = (
  postId: Post["id"],
  userId: Task["userId"] | null,
  boardId?: string
) => {
  const currentTasks = tasksSignal.value;
  const existingTask = currentTasks[postId];

  if (existingTask) {
    tasksSignal.value = {
      ...currentTasks,
      [postId]: {
        ...existingTask,
        userId,
        updatedAt: new Date(),
      },
    };
  } else {
    // Find the post to get its boardId
    const post = postsSignal.value.find((p) => p.id === postId);
    if (!post) {
      console.error(`No post found for ID ${postId}`);
      toast.error("Failed to find the post to assign a task");
      return;
    }
    const newTask: Task = {
      id: nanoid(),
      postId,
      boardId: boardId || post?.boardId || "",
      userId,
      state: TaskState.pending,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasksSignal.value = {
      ...currentTasks,
      [postId]: newTask,
    };
  }
};

export const updatePostState = (
  postId: Post["id"],
  state: Task["state"],
  boardId?: string
) => {
  const currentTasks = tasksSignal.value;
  const existingTask = currentTasks[postId];

  if (existingTask) {
    tasksSignal.value = {
      ...currentTasks,
      [postId]: {
        ...existingTask,
        state,
        updatedAt: new Date(),
      },
    };
  } else {
    // Find the post to get its boardId
    const post = postsSignal.value.find((p) => p.id === postId);
    if (!post) {
      console.error(`No post found for ID ${postId}`);
      toast.error("Failed to update post state");
      return;
    }
    const newTask: Task = {
      id: nanoid(),
      postId,
      boardId: boardId || post?.boardId || "",
      userId: null,
      state,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tasksSignal.value = {
      ...currentTasks,
      [postId]: newTask,
    };
  }
};

// Sorting operations
export const sortPosts = (
  criterion: SortCriterion,
  direction?: SortDirection
) => {
  sortCriteriaSignal.value = {
    criterion,
    direction: direction ?? "desc",
  };
};
