"use client";

import {
  addPost,
  addPostAction,
  assignTask,
  decrementPostVoteCount,
  incrementPostVoteCount,
  removePost,
  updatePostContent,
  updatePostState,
  updatePostType,
} from "@/lib/signal/postSignals";
import type { Task } from "@/lib/types/task";
import type { Post } from "@/lib/types/post";
import { EVENT_PREFIX, EVENT_TYPE } from "@/lib/utils/ably";
import { useChannel } from "ably/react";

interface PostChannelProps {
  boardId: string;
  userId: string;
}

export default function PostChannel({
  boardId,
  userId,
}: Readonly<PostChannelProps>) {
  useChannel(boardId, (message) => {
    const messageType = message.name;
    if (messageType === undefined) return;

    if (message.extras.headers.user !== userId) {
      if (messageType.startsWith(EVENT_PREFIX.POST)) {
        // Process post updates and creations
        processPostUpdates(messageType, message.data);
      } else if (messageType.startsWith(EVENT_PREFIX.MEMBER)) {
        // Process member updates and creations
      }
    }

    if (messageType.startsWith(EVENT_PREFIX.ACTION)) {
      // Process task updates and creations
      processTaskUpdates(messageType, message.data);
    }
  });

  return <></>;
}

function processPostUpdates(type: string, data: string): void {
  let post: Post;
  try {
    post = JSON.parse(data);
  } catch (error) {
    console.error("Failed to parse post data:", error);
    return;
  }

  switch (type) {
    case EVENT_TYPE.POST.ADD:
      addPost(post);
      break;
    case EVENT_TYPE.POST.UPDATE_CONTENT:
      updatePostContent(post.id, post.content);
      break;
    case EVENT_TYPE.POST.UPDATE_TYPE:
      updatePostType(post.id, post.type);
      break;
    case EVENT_TYPE.POST.DELETE:
      removePost(post.id);
      break;
    case EVENT_TYPE.POST.UPVOTE:
      incrementPostVoteCount(post.id);
      break;
    case EVENT_TYPE.POST.DOWNVOTE:
      decrementPostVoteCount(post.id);
      break;
    default:
      console.warn("Unknown post event type:", type);
  }
}

function processTaskUpdates(type: string, data: string): void {
  let postTask: Task;
  try {
    postTask = JSON.parse(data);
  } catch (error) {
    console.error("Failed to parse task data:", error);
    return;
  }

  switch (type) {
    case EVENT_TYPE.ACTION.STATE_UPDATE:
      updatePostState(postTask.postId, postTask.state);
      break;
    case EVENT_TYPE.ACTION.ASSIGN:
      assignTask(postTask.postId, postTask.userId);
      break;
    case EVENT_TYPE.ACTION.CREATE:
      addPostAction({
        id: postTask.id,
        postId: postTask.postId,
        boardId: postTask.boardId,
      });
      break;
    default:
      console.warn("Unknown task event type:", type);
  }
}
