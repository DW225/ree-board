"use server";

import { downVote, upVote } from "@/lib/db/vote";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { actionWithAuth } from "../actionWithAuth";

export const UpVotePostAction = async (
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  actionWithAuth(async () => {
    // Perform the upvote and get the updated count
    const voteCount = await upVote(postId, userId, boardId);

    // Publish real-time event with operation info (not absolute count)
    await ablyClient(boardId).publish({
      name: EVENT_TYPE.POST.UPVOTE,
      extras: {
        headers: {
          user: userId,
        },
      },
      data: JSON.stringify({ 
        id: postId, 
        operation: 'upvote',
        userId: userId,
        timestamp: Date.now()
      }),
    });

    return { voteCount };
  });

export const DownVotePostAction = async (
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  actionWithAuth(async () => {
    // Perform the downvote and get the updated count
    const voteCount = await downVote(postId, userId, boardId);

    // Publish real-time event with operation info (not absolute count)
    await ablyClient(boardId).publish({
      name: EVENT_TYPE.POST.DOWNVOTE,
      extras: {
        headers: {
          user: userId,
        },
      },
      data: JSON.stringify({ 
        id: postId, 
        operation: 'downvote',
        userId: userId,
        timestamp: Date.now()
      }),
    });

    return { voteCount };
  });
