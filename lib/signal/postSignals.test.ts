import { expect, it, jest } from "@jest/globals";
import { PostType } from "@/lib/constants/post";
import {
  addPost,
  initializePostSignals,
  postsSignal,
  updatePost,
  votesSignal,
} from "./postSignals";
import type { Post } from "@/lib/types/post";

jest.mock("nanoid", () => ({ nanoid: () => "unused" }));
const saved: Post = {
  id: "abcdefghijklmnopqrstu",
  boardId: "board-a",
  author: "actor",
  content: "saved",
  type: PostType.went_well,
  voteCount: 0,
  createdAt: new Date("2026-09-10"),
  updatedAt: new Date("2026-09-10"),
};

it.each([true, false])(
  "keeps one post when the create event arrives first: %s",
  (eventFirst) => {
    initializePostSignals([], []);
    addPost({
      ...saved,
      content: "  saved  ",
      createdAt: new Date("2099-01-01"),
    });
    if (eventFirst) addPost(saved);
    updatePost(saved.id, saved);
    if (!eventFirst) addPost(saved);
    // Duplicate create delivery must not undo a later vote.
    votesSignal.value = { [saved.id]: 1 };
    addPost(saved);
    expect(postsSignal.value).toEqual([saved]);
    expect(votesSignal.value[saved.id]).toBe(1);
  }
);
