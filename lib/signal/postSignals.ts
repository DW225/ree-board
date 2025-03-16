import { TaskState } from "@/db/schema";
import type { Task, NewTask } from "@/lib/types/task";
import type { Post } from "@/lib/types/post";
import type { Signal } from "@preact/signals-react";
import { signal } from "@preact/signals-react";

interface TaskSignal {
  assigned: Signal<Task["userId"] | null>; // userId or null
  state: Signal<Task["state"]>;
}

export interface PostSignal
  extends Omit<Post, "content" | "type" | "voteCount"> {
  content: Signal<Post["content"]>;
  type: Signal<Post["type"]>;
  voteCount: Signal<Post["voteCount"]>;
  task?: TaskSignal;
}

export const postSignal = signal<PostSignal[]>([]);

export const postSignalInitial = (posts: Post[], tasks: Task[]) => {
  postSignal.value = posts.map((post) => ({
    ...post,
    content: signal(post.content),
    type: signal(post.type),
    voteCount: signal(post.voteCount),
  }));

  for (const task of tasks) {
    const postIndex = postSignal.value.findIndex(
      (post) => post.id === task.postId
    );
    if (postIndex !== -1) {
      postSignal.value[postIndex].task = {
        assigned: signal(task.userId),
        state: signal(task.state),
      };
    }
  }
};

export const addPost = (newPost: Post) => {
  postSignal.value = [
    ...postSignal.value,
    {
      ...newPost,
      content: signal(newPost.content),
      type: signal(newPost.type),
      voteCount: signal(newPost.voteCount),
    },
  ];
};

export const removePost = (postID: Post["id"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  postSignal.value = [
    ...postSignal.value.slice(0, index),
    ...postSignal.value.slice(index + 1),
  ];
};

export const updatePostContent = (
  postID: Post["id"],
  newContent: Post["content"]
) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  postSignal.value[index].content.value = newContent;
};

export const updatePostType = (postID: Post["id"], newType: Post["type"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  postSignal.value[index].type.value = newType;
};

export const incrementPostVoteCount = (postID: Post["id"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  postSignal.value[index].voteCount.value += 1;
};

export const decrementPostVoteCount = (postID: Post["id"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1 && postSignal.value[index].voteCount.value > 0) {
    postSignal.value[index].voteCount.value -= 1;
  }
};

export const addPostAction = (action: NewTask) => {
  const postIndex = postSignal.value.findIndex(
    (post) => post.id === action.postId
  );
  if (postIndex !== -1) {
    if (postSignal.value[postIndex].task) {
      postSignal.value[postIndex].task.assigned.value = action.userId ?? null;
      postSignal.value[postIndex].task.state.value =
        action.state ?? TaskState.pending;
    } else {
      postSignal.value[postIndex].task = {
        assigned: signal(action.userId ?? null),
        state: signal(action.state ?? TaskState.pending),
      };
    }
  }
};

export const assignTask = (
  postID: Post["id"],
  userId: Task["userId"] | null
) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  if (postSignal.value[index].task) {
    postSignal.value[index].task.assigned.value = userId;
  } else {
    postSignal.value[index].task = {
      assigned: signal(userId),
      state: signal(TaskState.pending),
    };
  }
};

export const updatePostState = (postID: Post["id"], state: Task["state"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  if (postSignal.value[index].task) {
    postSignal.value[index].task.state.value = state;
  } else {
    postSignal.value[index].task = {
      assigned: signal(null),
      state: signal(TaskState.pending),
    };
  }
};
