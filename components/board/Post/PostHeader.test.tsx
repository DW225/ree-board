import type * as React from "react";
import { Children, isValidElement } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authedPostActionStateUpdate } from "@/lib/actions/task/action";
import { PostType } from "@/lib/constants/post";
import {
  enrichedPostsSignal,
  initializePostSignals,
  tasksSignal,
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

afterEach(() => {
  initializePostSignals([], []);
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

it("restores pending state 0 after a status update fails", async () => {
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
  initializePostSignals([post], [task]);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  const { promise, reject } =
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

  reject(new Error("offline"));
  await update;

  expect(enrichedPostsSignal.value[0].task?.state).toBe(0);
  expect(toast.error).toHaveBeenCalledWith("Failed to update status");
});
