"use server";

import { downVote, upVote } from "@/lib/db/vote";
import type { Board } from "@/lib/types/board";
import type { Post } from "@/lib/types/post";
import type { User } from "@/lib/types/user";
import { ablyClient, EVENT_TYPE } from "@/lib/utils/ably";
import { actionWithAuth } from "../actionWithAuth";

export const UpVotePostAction = async (
  postID: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  actionWithAuth(() =>
    Promise.all([
      upVote(postID, userId, boardId),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.UPVOTE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id: postID }),
      }),
    ])
  );

export const DownVotePostAction = async (
  postID: Post["id"],
  userId: User["id"],
  boardId: Board["id"]
) =>
  actionWithAuth(() =>
    Promise.all([
      downVote(postID, userId, boardId),
      ablyClient(boardId).publish({
        name: EVENT_TYPE.POST.DOWNVOTE,
        extras: {
          headers: {
            user: userId,
          },
        },
        data: JSON.stringify({ id: postID }),
      }),
    ])
  );
