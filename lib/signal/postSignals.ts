import type { Post, PostType } from "@/db/schema";
import type { Signal } from "@preact/signals-react";
import { signal } from "@preact/signals-react";

export interface PostSignal extends Omit<Post, "content" | "type"> {
  content: Signal<string>;
  type: Signal<PostType>;
}

export const postSignal = signal<PostSignal[]>([]);

export const postSignalInitial = (posts: Post[]) => {
  postSignal.value = posts.map((post) => ({
    ...post,
    content: signal(post.content),
    type: signal(post.type),
  }));
};

export const addPost = (newPost: Post) => {
  postSignal.value = [
    ...postSignal.value,
    {
      ...newPost,
      content: signal(newPost.content),
      type: signal(newPost.type),
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
  if (index!== -1) {
    postSignal.value[index].content.value = newContent;
  }
};

export const updatePostType = (postID: string, newType: PostType) => {
  const index = postSignal.value.findIndex((post) => post.id === postID);
  if (index!== -1) {
    postSignal.value[index].type.value = newType;
  }
};
