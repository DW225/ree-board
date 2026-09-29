import type * as React from "react";
import { useEffect } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { UpdatePostTypeAction } from "@/lib/actions/post/action";
import {
  postsSignal,
  updatePostType,
  updatePostContent,
} from "@/lib/signal/postSignals";
import { toast } from "sonner";
import PostProvider from "./PostProvider";

jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  useEffect: jest.fn(),
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
}));
jest.mock("@/lib/utils/effect", () => ({ useEffectOnce: jest.fn() }));
jest.mock("@/lib/actions/post/action", () => ({
  UpdatePostTypeAction: jest.fn(),
}));
jest.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  monitorForElements: jest.fn(),
}));
jest.mock("nanoid", () => ({ nanoid: () => "test-id" }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const dispose = jest.fn();
let doc: EventTarget;

beforeEach(() => {
  jest.clearAllMocks();
  doc = new EventTarget();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: doc,
  });
  jest.mocked(monitorForElements).mockReturnValue(dispose);
  postsSignal.value = [
    {
      id: "post",
      boardId: "board",
      type: 3,
      author: null,
      content: "text",
      voteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

function mount() {
  void PostProvider({
    children: null,
    boardId: "board",
    initials: { posts: [], actions: [], votedPosts: [], members: [] },
  });
  return jest.mocked(useEffect).mock.calls[0][0]();
}
async function start() {
  const cleanup = mount();
  doc.dispatchEvent(new Event("mousedown"));
  doc.dispatchEvent(new Event("touchstart"));
  await flush();
  expect(monitorForElements).toHaveBeenCalledTimes(1);
  return cleanup;
}
function drop(postType: unknown, id = "post", boardId = "board") {
  const callback = jest.mocked(monitorForElements).mock.calls[0][0].onDrop;
  if (!callback) throw new Error("Drop callback was not registered");
  return callback({
    source: { data: { type: "post", id, boardId, originalType: 3 } },
    location: { current: { dropTargets: [{ data: { postType } }] } },
  } as unknown as Parameters<typeof callback>[0]);
}

it.each([0, 1, 2, 3])("uses the validated destination %s", async (type) => {
  postsSignal.value = postsSignal.value.map((post) => ({
    ...post,
    type: type === 3 ? 0 : 3,
  }));
  await start();
  drop(type);
  await flush();
  expect(UpdatePostTypeAction).toHaveBeenCalledWith("post", "board", type);
  expect(postsSignal.value[0].type).toBe(type);
});
it.each([-1, 4, NaN, "1"])("rejects invalid destination %s", async (type) => {
  await start();
  drop(type);
  await flush();
  expect(UpdatePostTypeAction).not.toHaveBeenCalled();
  expect(postsSignal.value[0].type).toBe(3);
});
it.each([
  ["missing", "board"],
  ["post", "other"],
])("rejects missing/foreign source %s %s", async (id, board) => {
  await start();
  drop(1, id, board);
  await flush();
  expect(UpdatePostTypeAction).not.toHaveBeenCalled();
});
it.each([false, true])(
  "rolls back failed saves without replacing newer updates (%s)",
  async (newer) => {
    let rejectSave: (error: Error) => void = () => undefined;
    jest.mocked(UpdatePostTypeAction).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSave = reject;
        })
    );
    await start();
    drop(1);
    drop(2);
    expect(UpdatePostTypeAction).toHaveBeenCalledTimes(1);
    if (newer) updatePostType("post", 0);
    rejectSave(new Error("offline"));
    await flush();
    expect(postsSignal.value[0].type).toBe(newer ? 0 : 3);
    expect(toast.error).toHaveBeenCalledWith("Failed to move post");
  }
);
it("does not register after unmount and allows a fresh mount", async () => {
  const cleanup = mount();
  doc.dispatchEvent(new Event("mousedown"));
  if (typeof cleanup === "function") cleanup();
  await flush();
  expect(monitorForElements).not.toHaveBeenCalled();
  jest.mocked(useEffect).mockClear();
  await start();
});
it("retries failed initialization and removes the monitor on cleanup", async () => {
  jest.mocked(monitorForElements).mockImplementationOnce(() => {
    throw new Error("load failed");
  });
  const cleanup = mount();
  doc.dispatchEvent(new Event("mousedown"));
  await flush();
  doc.dispatchEvent(new Event("touchstart"));
  await flush();
  expect(monitorForElements).toHaveBeenCalledTimes(2);
  if (typeof cleanup === "function") cleanup();
  expect(dispose).toHaveBeenCalledTimes(1);
});

it("rolls back a failed move while retaining a newer content edit", async () => {
  let rejectSave: (error: Error) => void = () => undefined;
  jest.mocked(UpdatePostTypeAction).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectSave = reject;
      })
  );
  await start();
  drop(1);
  updatePostContent("post", "Newer content");
  rejectSave(new Error("offline"));
  await flush();
  expect(postsSignal.value[0].type).toBe(3);
  expect(postsSignal.value[0].content).toBe("Newer content");
});
