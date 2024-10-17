import type { Post, PostType } from "@/db/schema";
import type { Signal } from "@preact/signals-react";
import { signal } from "@preact/signals-react";

export interface PostSignal
  extends Omit<Post, "content" | "type" | "voteCount"> {
  content: Signal<string>;
  type: Signal<PostType>;
  voteCount: Signal<number>;
}

export const postSignal = signal<PostSignal[]>([]);

export const postSignalInitial = (posts: Post[]) => {
  postSignal.value = posts.map((post) => ({
    ...post,
    content: signal(post.content),
    type: signal(post.type),
    voteCount: signal(post.voteCount),
  }));
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

export const removePost = (postID: string) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1) {
    postSignal.value = [
      ...postSignal.value.slice(0, index),
      ...postSignal.value.slice(index + 1),
    ];
  }
};

export const updatePostContent = (postID: string, newContent: string) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1) {
    postSignal.value[index].content.value = newContent;
  }
};

export const updatePostType = (postID: string, newType: PostType) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1) {
    postSignal.value[index].type.value = newType;
  }
};

export const incrementPostVoteCount = (postID: string) => {
  console.log("Incrementing vote count for post", postID);
  const index = postSignal.value.findIndex((post) => post.id === postID);
  console.log("Current vote count:", postSignal.value[index].voteCount.value);
  if (index !== -1) {
    postSignal.value[index].voteCount.value += 1;
  }
};

export const decrementPostVoteCount = (postID: string) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index !== -1 && postSignal.value[index].voteCount.value > 0) {
    postSignal.value[index].voteCount.value -= 1;
  }
};
