import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import {
  addPost,
  assignTask,
  initializePostSignals,
  mergePosts,
  postsSignal,
  rollbackMerge,
  tasksSignal,
  updatePost,
  updatePostState,
  votesSignal,
} from "./postSignals";
import type { Post } from "@/lib/types/post";
import { toast } from "sonner";

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

const taskOperations = [
  {
    name: "assignment",
    apply: (boardId?: string) => assignTask(saved.id, "assigned-user", boardId),
    changes: { userId: "assigned-user" },
    created: { userId: "assigned-user", state: TaskState.pending },
  },
  {
    name: "state update",
    apply: (boardId?: string) =>
      updatePostState(saved.id, TaskState.pending, boardId),
    changes: { state: TaskState.pending },
    created: { userId: null, state: TaskState.pending },
  },
];

describe("task state mutations", () => {
  const now = new Date("2026-10-03T00:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });
  afterEach(() => {
    initializePostSignals([], []);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(taskOperations)(
    "$name retains the existing task identity and other fields",
    ({ apply, changes }) => {
      const task = {
        id: "existing-task",
        postId: saved.id,
        boardId: saved.boardId,
        userId: "previous-user",
        state: TaskState.completed,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
      initializePostSignals([saved], [task]);
      apply("different-board");
      expect(tasksSignal.value[saved.id]).toEqual({
        ...task,
        ...changes,
        updatedAt: now,
      });
    }
  );

  describe.each(taskOperations)(
    "$name creates a missing task",
    ({ apply, created }) => {
      it.each([
        { boardId: "explicit-board", expectedBoardId: "explicit-board" },
        { boardId: undefined, expectedBoardId: "board-a" },
        { boardId: "", expectedBoardId: "board-a" },
      ])(
        "uses board $expectedBoardId for override $boardId",
        ({ boardId, expectedBoardId }) => {
          initializePostSignals([saved], []);
          apply(boardId);
          expect(tasksSignal.value[saved.id]).toEqual({
            id: "unused",
            postId: saved.id,
            boardId: expectedBoardId,
            ...created,
            createdAt: now,
            updatedAt: now,
          });
        }
      );
    }
  );

  it.each(taskOperations)(
    "$name reports a missing post without creating a task",
    ({ apply }) => {
      const error = jest.spyOn(toast, "error").mockImplementation(() => 0);
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      initializePostSignals([], []);
      apply();
      expect(tasksSignal.value).toEqual({});
      expect(error).toHaveBeenCalledWith(expect.any(String));
    }
  );
});
