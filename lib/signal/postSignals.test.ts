import { expect, it, jest } from "@jest/globals";
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import {
  addPost,
  initializePostSignals,
  mergePosts,
  postsSignal,
  rollbackMerge,
  tasksSignal,
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

it("merges signal state and restores posts, votes, and tasks on rollback", () => {
  const posts = [
    { ...saved, id: "target", content: "target", voteCount: 2 },
    { ...saved, id: "source", content: "source", voteCount: 3 },
    { ...saved, id: "other", content: "unrelated", voteCount: 1 },
  ];
  const tasks = ["target", "source", "other"].map((postId) => ({
    id: `task-${postId}`,
    postId,
    boardId: saved.boardId,
    userId: saved.author,
    state: TaskState.pending,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  }));
  initializePostSignals(posts, tasks);
  votesSignal.value = { target: 2, source: 5, other: 1 };

  const rollback = mergePosts("target", ["source"], "merged content");

  expect(postsSignal.value).toEqual([
    expect.objectContaining({
      id: "target",
      content: "merged content",
      voteCount: 5,
    }),
    posts[2],
  ]);
  expect(votesSignal.value).toEqual({ target: 5, other: 1 });
  expect(tasksSignal.value).toEqual({ target: tasks[0], other: tasks[2] });

  rollbackMerge(rollback);

  expect(postsSignal.value).toHaveLength(3);
  expect(postsSignal.value).toEqual(expect.arrayContaining(posts));
  expect(votesSignal.value).toEqual({ target: 2, source: 5, other: 1 });
  expect(tasksSignal.value).toEqual({
    target: tasks[0],
    source: tasks[1],
    other: tasks[2],
  });
});
