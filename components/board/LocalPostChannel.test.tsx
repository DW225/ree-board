/// <reference types="jest" />
import type { EffectCallback } from "react";
import type * as React from "react";
import { LocalPostChannel } from "./LocalPostChannel";
import type { BoardInitialData } from "./PostProvider";
import { initializePostSignals, postsSignal } from "@/lib/signal/postSignals";

const mockRefresh = jest.fn();
const mockRouter = { refresh: mockRefresh };
const mockResetVotes = jest.fn();
const mockSetStatus = jest.fn();
const mockRefs: { current: unknown }[] = [];
let mockRefIndex = 0;
let mockEffects: EffectCallback[] = [];
let ready: () => void;
const stream = {
  addEventListener: jest.fn((_name: string, callback: () => void) => {
    ready = callback;
  }),
  onerror: () => {},
  close: jest.fn(),
};

jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
jest.mock("./PostProvider", () => ({
  useVotedPosts: () => ({ resetVotedPosts: mockResetVotes }),
}));
jest.mock("@/lib/signal/postSignals", () => {
  const signal = () => ({
    value: {},
    peek() {
      return this.value;
    },
  });
  return {
    postsSignal: signal(),
    tasksSignal: signal(),
    votesSignal: signal(),
    initializePostSignals: jest.fn(),
  };
});
jest.mock("@/lib/signal/memberSignals", () => ({
  membersSignal: { peek: () => null },
  memberSignalInitial: jest.fn(),
}));
jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  useState: () => ["Connecting", mockSetStatus],
  useRef: (value: unknown) => (mockRefs[mockRefIndex++] ??= { current: value }),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: EffectCallback) => {
    mockEffects.push(effect);
  },
}));

const initials: BoardInitialData = {
  posts: [],
  actions: [],
  members: [],
  votedPosts: [],
};
const onMessage = jest.fn();
function render(data = initials) {
  mockRefIndex = 0;
  mockEffects = [];
  LocalPostChannel({ boardId: "board-a", initials: data, onMessage });
  mockEffects[0]();
}

it("rejects changed and interrupted snapshots before accepting a fresh board read", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "EventSource");
  Object.defineProperty(globalThis, "EventSource", {
    configurable: true,
    value: jest.fn(() => stream),
  });
  let cleanup: ReturnType<EffectCallback> = undefined;
  try {
    render();
    cleanup = mockEffects[1]();
    ready();
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // A delivered event or optimistic edit must survive an older server read.
    postsSignal.value = [];
    render({ ...initials });
    expect(initializePostSignals).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    // A second reconnect must not let the unfinished read consume the new request.
    stream.onerror();
    ready();
    expect(mockRefresh).toHaveBeenCalledTimes(2);
    render({ ...initials });
    expect(initializePostSignals).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalledTimes(3);

    const fresh = { ...initials, votedPosts: ["post-a"] };
    render(fresh);
    expect(initializePostSignals).toHaveBeenCalledWith(
      fresh.posts,
      fresh.actions
    );
    expect(mockResetVotes).toHaveBeenCalledWith(["post-a"]);
    expect(mockSetStatus).toHaveBeenLastCalledWith("Connected");
  } finally {
    cleanup?.();
    if (original) Object.defineProperty(globalThis, "EventSource", original);
    else Reflect.deleteProperty(globalThis, "EventSource");
  }
});
