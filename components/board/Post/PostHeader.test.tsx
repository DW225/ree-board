import type * as React from "react";
import { Children, isValidElement } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authedPostActionStateUpdate } from "@/lib/actions/task/action";
import { PostType } from "@/lib/constants/post";
import {
  addPostTask,
  assignTask,
  enrichedPostsSignal,
  initializePostSignals,
  removePost,
  tasksSignal,
  updatePostState,
} from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";
import { toast } from "sonner";
import { PostHeader } from "./PostHeader";

// Use the existing Node component-test pattern; keep status mutations real.
jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  memo: (component: unknown) => component,
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, jest.fn()],
  useTransition: () => [false, jest.fn()],
}));
jest.mock("nanoid", () => ({ nanoid: () => "unused" }));
jest.mock("@/lib/actions/task/action", () => ({
  authedPostActionStateUpdate: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

interface MenuItemProps {
  children?: React.ReactNode;
  onClick?: () => Promise<void>;
}

function findStatusItem(
  node: React.ReactNode,
  label: string
): React.ReactElement<MenuItemProps> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<MenuItemProps>(child)) continue;
    if (child.type === DropdownMenuItem && child.props.children === label) {
      return child;
    }
    const match = findStatusItem(child.props.children, label);
    if (match) return match;
  }
}

const post: Post = {
  id: "post",
  boardId: "board",
  author: "author",
  content: "Action item",
  type: PostType.action_item,
  voteCount: 0,
  createdAt: new Date("2026-10-05"),
  updatedAt: new Date("2026-10-05"),
};
const task: Task = {
  id: "task",
  postId: post.id,
  boardId: post.boardId,
  userId: "assignee",
  state: 0,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
};

function statusMenu() {
  const tree = PostHeader({
    post: enrichedPostsSignal.value[0],
    onDelete: jest.fn(),
    onUpdate: jest.fn(),
  });
  return (label: string) => {
    const select = findStatusItem(tree, label)?.props.onClick;
    if (!select) throw new Error(`${label} status item was not rendered`);
    return select();
  };
}

function deferStatusUpdate() {
  const request =
    Promise.withResolvers<
      Awaited<ReturnType<typeof authedPostActionStateUpdate>>
    >();
  jest.mocked(authedPostActionStateUpdate).mockReturnValueOnce(request.promise);
  return request;
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  initializePostSignals([], []);
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it.each([
  { taskLoaded: true, laterStatus: null, laterFails: false },
  { taskLoaded: false, laterStatus: null, laterFails: false },
  { taskLoaded: false, laterStatus: 2, laterFails: false },
  { taskLoaded: false, laterStatus: 1, laterFails: false },
  { taskLoaded: false, laterStatus: 2, laterFails: true },
  { taskLoaded: true, laterStatus: 0, laterFails: false },
])(
  "rolls back only its own status update: %j",
  async ({ taskLoaded, laterStatus, laterFails }) => {
    initializePostSignals([post], taskLoaded ? [task] : []);
    const { promise, resolve, reject } =
      Promise.withResolvers<
        Awaited<ReturnType<typeof authedPostActionStateUpdate>>
      >();
    jest.mocked(authedPostActionStateUpdate).mockReturnValueOnce(promise);

    const tree = PostHeader({
      post: enrichedPostsSignal.value[0],
      onDelete: jest.fn(),
      onUpdate: jest.fn(),
    });
    const selectStatus = findStatusItem(tree, "In Progress")?.props.onClick;
    if (!selectStatus)
      throw new Error("In Progress status item was not rendered");

    const update = selectStatus();
    expect(tasksSignal.value[post.id].state).toBe(1);
    expect(authedPostActionStateUpdate).toHaveBeenCalledWith({
      postId: "post",
      boardId: "board",
      state: 1,
    });

    if (laterStatus === 1) {
      await selectStatus();
      expect(authedPostActionStateUpdate).toHaveBeenCalledTimes(1);
      // A later server update can confirm the same status.
      updatePostState(post.id, laterStatus);
    } else if (laterStatus !== null) {
      if (laterFails) {
        jest
          .mocked(authedPostActionStateUpdate)
          .mockRejectedValueOnce(new Error("offline"));
      } else {
        jest.mocked(authedPostActionStateUpdate).mockResolvedValueOnce([]);
      }
      const label = laterStatus === 0 ? "To Do" : "Done";
      const selectLaterStatus = findStatusItem(tree, label)?.props.onClick;
      if (!selectLaterStatus)
        throw new Error(`${label} status item was not rendered`);
      await selectLaterStatus();
      expect(authedPostActionStateUpdate).toHaveBeenLastCalledWith({
        postId: post.id,
        boardId: post.boardId,
        state: laterStatus,
      });
    }
    if (laterFails) resolve([]);
    else reject(new Error("offline"));
    await update;

    expect(enrichedPostsSignal.value[0].task?.state).toBe(
      laterFails ? 1 : (laterStatus ?? 0)
    );
    expect(toast.error).toHaveBeenCalledWith("Failed to update status");
  }
);

it.each([
  { firstSucceeds: false, secondSucceeds: false, secondFinishesFirst: false },
  { firstSucceeds: false, secondSucceeds: false, secondFinishesFirst: true },
  { firstSucceeds: true, secondSucceeds: false, secondFinishesFirst: false },
  { firstSucceeds: true, secondSucceeds: false, secondFinishesFirst: true },
  { firstSucceeds: false, secondSucceeds: true, secondFinishesFirst: false },
  { firstSucceeds: false, secondSucceeds: true, secondFinishesFirst: true },
  { firstSucceeds: true, secondSucceeds: true, secondFinishesFirst: false },
  { firstSucceeds: true, secondSucceeds: true, secondFinishesFirst: true },
])("keeps the latest successful status: %j", async (scenario) => {
  initializePostSignals([post], [task]);
  const select = statusMenu();
  const first = deferStatusUpdate();
  const firstUpdate = select("In Progress");
  const second = deferStatusUpdate();
  const secondUpdate = select("Done");
  expect(tasksSignal.value[post.id].state).toBe(2);

  const settleFirst = async () => {
    if (scenario.firstSucceeds) first.resolve([]);
    else first.reject(new Error("first failed"));
    await firstUpdate;
  };
  const settleSecond = async () => {
    if (scenario.secondSucceeds) second.resolve([]);
    else second.reject(new Error("second failed"));
    await secondUpdate;
  };
  if (scenario.secondFinishesFirst) {
    await settleSecond();
    expect(tasksSignal.value[post.id].state).toBe(
      scenario.secondSucceeds ? 2 : 1
    );
    await settleFirst();
  } else {
    await settleFirst();
    expect(tasksSignal.value[post.id].state).toBe(2);
    await settleSecond();
  }

  const expected = scenario.secondSucceeds ? 2 : Number(scenario.firstSucceeds);
  expect(tasksSignal.value[post.id].state).toBe(expected);
});

it.each([true, false])(
  "rolls back status without losing task metadata (task loaded: %s)",
  async (taskLoaded) => {
    initializePostSignals([post], taskLoaded ? [task] : []);
    const request = deferStatusUpdate();
    const update = statusMenu()("In Progress");
    addPostTask({ id: "server-task", postId: post.id, boardId: post.boardId });
    assignTask(post.id, "new-assignee");
    request.reject(new Error("offline"));
    await update;
    expect(tasksSignal.value[post.id]).toMatchObject({
      id: "server-task",
      userId: "new-assignee",
      state: 0,
    });
  }
);

it.each([0, 1, 2])("keeps a newer server status of %s", async (state) => {
  initializePostSignals([post], [task]);
  const request = deferStatusUpdate();
  const update = statusMenu()("In Progress");
  updatePostState(post.id, state);
  request.reject(new Error("offline"));
  await update;
  expect(tasksSignal.value[post.id].state).toBe(state);
});

it.each(["reload", "remove"])(
  "ignores a failed status request after %s",
  async (operation) => {
    initializePostSignals([post], [task]);
    const request = deferStatusUpdate();
    const update = statusMenu()("In Progress");
    if (operation === "reload") initializePostSignals([post], [task]);
    else removePost(post.id);
    request.reject(new Error("offline"));
    await update;
    expect(tasksSignal.value[post.id]).toEqual(
      operation === "reload" ? task : undefined
    );
  }
);
