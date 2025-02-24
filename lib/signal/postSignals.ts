import type { Action, NewAction, Post, PostType } from "@/db/schema";
import { ActionState } from "@/db/schema";
import type { Signal } from "@preact/signals-react";
import { signal } from "@preact/signals-react";

interface ActionSignal {
  assigned: Signal<Action["userId"] | null>; // userId or null
  state: Signal<Action["state"]>;
}

export interface PostSignal
  extends Omit<Post, "content" | "type" | "voteCount"> {
  content: Signal<Post["content"]>;
  type: Signal<Post["type"]>;
  voteCount: Signal<Post["voteCount"]>;
  action?: ActionSignal;
}

export const postSignal = signal<PostSignal[]>([]);

export const postSignalInitial = (posts: Post[], actions: Action[]) => {
  postSignal.value = posts.map((post) => ({
    ...post,
    content: signal(post.content),
    type: signal(post.type),
    voteCount: signal(post.voteCount),
  }));

  for (const action of actions) {
    const postIndex = postSignal.value.findIndex(
      (post) => post.id === action.postId
    );
    if (postIndex !== -1) {
      postSignal.value[postIndex].action = {
        assigned: signal(action.userId),
        state: signal(action.state),
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
  if (index !== -1) {
    postSignal.value = [
      ...postSignal.value.slice(0, index),
      ...postSignal.value.slice(index + 1),
    ];
  }
};

export const updatePostContent = (
  postID: Post["id"],
  newContent: Post["content"]
) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1) {
    postSignal.value[index].content.value = newContent;
  }
};

export const updatePostType = (postID: Post["id"], newType: PostType) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1) {
    postSignal.value[index].type.value = newType;
  }
};

export const incrementPostVoteCount = (postID: Post["id"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1) {
    postSignal.value[index].voteCount.value += 1;
  }
};

export const decrementPostVoteCount = (postID: Post["id"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1 && postSignal.value[index].voteCount.value > 0) {
    postSignal.value[index].voteCount.value -= 1;
  }
};

export const addPostAction = (action: NewAction) => {
  const postIndex = postSignal.value.findIndex(
    (post) => post.id === action.postId
  );
  if (postIndex !== -1) {
    if (postSignal.value[postIndex].action) {
      postSignal.value[postIndex].action.assigned.value = action.userId ?? null;
      postSignal.value[postIndex].action.state.value =
        action.state ?? ActionState.pending;
    } else {
      postSignal.value[postIndex].action = {
        assigned: signal(action.userId ?? null),
        state: signal(action.state ?? ActionState.pending),
      };
    }
  }
};

export const assignPostAction = (
  postID: Post["id"],
  userId: Action["userId"] | null
) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  if (postSignal.value[index].action) {
    postSignal.value[index].action.assigned.value = userId;
  } else {
    postSignal.value[index].action = {
      assigned: signal(userId),
      state: signal(ActionState.pending),
    };
  }
};

export const updatePostState = (postID: Post["id"], state: Action["state"]) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index === -1) return;

  if (postSignal.value[index].action) {
    postSignal.value[index].action.state.value = state;
  } else {
    postSignal.value[index].action = {
      assigned: signal(null),
      state: signal(ActionState.pending),
    };
  }
};
