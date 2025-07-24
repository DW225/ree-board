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
  actionWithAuth(() =>
    Promise.all([
      upVote(postId, userId, boardId),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPVOTE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id: postId }),
      }),
    ])
  );

export const DownVotePostAction = async (
  postId: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  actionWithAuth(() =>
    Promise.all([
      downVote(postId, userId, boardId),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DOWNVOTE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id: postId }),
      }),
    ])
  );
