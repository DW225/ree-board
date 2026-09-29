import type * as React from "react";
import { Children, isValidElement, useState } from "react";
import { authedPostAssign } from "@/lib/actions/task/action";
import { assignTask } from "@/lib/signal/postSignals";
import type { EnrichedPost } from "@/lib/signal/postSignals";
import type { MemberSignal } from "@/lib/types/member";
import { toast } from "sonner";
import MemberList from "@/components/board/MemberList";
import { AssignTaskDialog } from "./AssignTaskDialog";
import { PostFooter } from "./PostFooter";

jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  memo: (component: unknown) => component,
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useState: jest.fn((initial: unknown) => [
    initial === null ? { userId: "member" } : initial,
    jest.fn(),
  ]),
}));
jest.mock("@/lib/actions/task/action", () => ({ authedPostAssign: jest.fn() }));
jest.mock("@/lib/signal/postSignals", () => ({ assignTask: jest.fn() }));
jest.mock("../PostProvider", () => ({
  useVotedPosts: () => ({ hasVoted: () => false }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function find(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<Record<string, unknown>>) => boolean
): React.ReactElement<Record<string, unknown>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (predicate(child)) return child;
    const match = find(child.props.children as React.ReactNode, predicate);
    if (match) return match;
  }
}
const member = { userId: "member" } as MemberSignal;
const post = {
  id: "post",
  boardId: "board",
  type: 3,
  task: { userId: "previous", state: 0 },
} as EnrichedPost;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

function assignment() {
  const tree = PostFooter({
    post,
    viewOnly: false,
    handleVote: async () => undefined,
  });
  return find(tree, (element) => element.type === AssignTaskDialog)?.props
    .onAssign as (member: MemberSignal) => Promise<void>;
}
it("rejects a failed save after restoring the previous assignee", async () => {
  jest.mocked(authedPostAssign).mockRejectedValueOnce(new Error("offline"));
  await expect(assignment()(member)).rejects.toThrow("offline");
  expect(assignTask).toHaveBeenLastCalledWith("post", "previous", "board");
});
it("keeps the dialog open after failure, allows retry, and blocks duplicate submission", async () => {
  jest.mocked(authedPostAssign).mockRejectedValueOnce(new Error("offline"));
  const onClose = jest.fn();
  const tree = AssignTaskDialog({
    isOpen: true,
    onClose,
    onAssign: assignment(),
  });
  const submit = find(
    tree,
    (element) =>
      element.type === "button" && element.props.children === "Assign Task"
  )?.props.onClick as () => void;
  submit();
  submit();
  await flush();
  expect(authedPostAssign).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledTimes(1);
  jest.mocked(authedPostAssign).mockResolvedValueOnce([]);
  submit();
  await flush();
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledWith("Task assigned");
});

it("retains the selected member when optimistic assignment and rollback rerender the dialog", () => {
  const states: unknown[] = [];
  let cursor = 0;
  let updates = 0;
  jest.mocked(useState).mockImplementation((initial?: unknown) => {
    const index = cursor++;
    if (index >= states.length) states.push(initial);
    return [
      states.at(index),
      (value: unknown) => {
        states.splice(index, 1, value);
        updates++;
      },
    ];
  });
  function render(currentAssigneeId: string | null) {
    let tree: React.ReactNode;
    let previousUpdates: number;
    do {
      cursor = 0;
      previousUpdates = updates;
      tree = AssignTaskDialog({
        isOpen: true,
        currentAssigneeId,
        onClose: jest.fn(),
        onAssign: async () => undefined,
      });
    } while (previousUpdates !== updates);
    return tree;
  }
  const list = find(render(null), (element) => element.type === MemberList);
  if (!list) throw new Error("Member list was not rendered");
  (list.props.onSelect as (member: MemberSignal) => void)(member);
  expect(
    find(render(null), (element) => element.type === MemberList)?.props
      .selectedUserId
  ).toBe("member");
  render("member");
  expect(
    find(render(null), (element) => element.type === MemberList)?.props
      .selectedUserId
  ).toBe("member");
});
