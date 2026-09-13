/// <reference types="jest" />
import PostChannel from "./PostChannelComponent";
import { addPostTask, updatePostState } from "@/lib/signal/postSignals";
import type * as React from "react";

interface IncomingMessage {
  name?: string;
  data: unknown;
  extras?: unknown;
}
let mockReceive: (message: IncomingMessage) => void;
const mockUseChannel = jest.fn();
jest.mock(
  "ably/react",
  () => ({
    useChannel: (channel: string, callback: typeof mockReceive) => {
      mockUseChannel(channel);
      mockReceive = callback;
    },
  }),
  { virtual: true }
);
jest.mock("ably/modular", () => ({ BaseRest: jest.fn(), FetchRequest: {} }), {
  virtual: true,
});
jest.mock("react", () => ({
  ...jest.requireActual<typeof React>("react"),
  useMemo: <T>(factory: () => T) => factory(),
}));
jest.mock("@/lib/signal/postSignals", () => ({
  addPostTask: jest.fn(),
  updatePostState: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  PostChannel({ boardId: "board-a", userId: "actor" });
  expect(mockUseChannel).toHaveBeenCalledWith("board:board-a");
});

it("processes task creation without actor headers through the real processor", () => {
  mockReceive({
    name: "ACTION_CREATE",
    data: JSON.stringify({
      id: "task-a",
      postId: "post-a",
      boardId: "board-a",
    }),
  });
  expect(addPostTask).toHaveBeenCalledWith({
    id: "task-a",
    postId: "post-a",
    boardId: "board-a",
  });
});

it.each([
  undefined,
  null,
  {},
  { headers: null },
  { headers: 12 },
  { headers: { user: {} } },
  "invalid",
])("processes task state with missing or malformed extras %j", (extras) => {
  mockReceive({
    name: "ACTION_STATE_UPDATE",
    data: { postId: "post-a", state: 0 },
    extras,
  });
  expect(updatePostState).toHaveBeenCalledWith("post-a", 0);
});

it("still rejects invalid task payloads through Zod", () => {
  const error = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  try {
    mockReceive({
      name: "ACTION_STATE_UPDATE",
      data: { postId: "post-a", state: "forged" },
    });
    expect(updatePostState).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});
