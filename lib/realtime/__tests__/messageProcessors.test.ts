/// <reference types="jest" />
import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";

// Mock the ably utilities module
jest.mock("@/lib/utils/ably", () => ({
  EVENT_TYPE: {
    POST: {
      ADD: "POST_ADD",
      MERGE: "POST_MERGE",
      UPDATE_CONTENT: "POST_UPDATE_CONTENT",
      DELETE: "POST_DELETE",
      UPDATE_TYPE: "POST_UPDATE_TYPE",
      UPVOTE: "POST_UPVOTE",
      DOWNVOTE: "POST_DOWNVOTE",
    },
    ACTION: {
      CREATE: "ACTION_CREATE",
      ASSIGN: "ACTION_ASSIGN",
      STATE_UPDATE: "ACTION_STATE_UPDATE",
    },
  },
  EVENT_PREFIX: {
    POST: "POST",
    ACTION: "ACTION",
    MEMBER: "MEMBER",
  },
}));

// Import EVENT_TYPE after mocking
import { EVENT_TYPE } from "@/lib/utils/ably";

// Mock the signal functions
const mockPostSignals = {
  addPost: jest.fn(),
  updatePost: jest.fn(),
  removePost: jest.fn(),
  updatePostContent: jest.fn(),
  updatePostType: jest.fn(),
  incrementPostVoteCount: jest.fn(),
  decrementPostVoteCount: jest.fn(),
};

const mockTaskSignals = {
  addPostTask: jest.fn(),
  assignTask: jest.fn(),
  updatePostState: jest.fn(),
};

// Mock dependencies
jest.mock("@/lib/signal/postSignals", () => ({
  addPost: mockPostSignals.addPost,
  updatePost: mockPostSignals.updatePost,
  removePost: mockPostSignals.removePost,
  updatePostContent: mockPostSignals.updatePostContent,
  updatePostType: mockPostSignals.updatePostType,
  incrementPostVoteCount: mockPostSignals.incrementPostVoteCount,
  decrementPostVoteCount: mockPostSignals.decrementPostVoteCount,
  addPostTask: mockTaskSignals.addPostTask,
  assignTask: mockTaskSignals.assignTask,
  updatePostState: mockTaskSignals.updatePostState,
}));

// Import the functions we'll create
import {
  createMessageProcessor,
  createPostMessageProcessor,
  createTaskMessageProcessor,
  processPostMessage,
  processTaskMessage,
  type PostMessageData,
  type TaskMessageData,
  type VoteMessageData,
} from "../messageProcessors";

// Test helper functions to reduce nesting
function expectNotToThrow(fn: () => void): void {
  expect(fn).not.toThrow();
}

function expectConsoleError(
  consoleSpy: jest.SpyInstance,
  messageContaining: string
): void {
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(messageContaining),
    expect.objectContaining({ details: expect.any(Array) })
  );
}

function expectConsoleWarn(
  consoleSpy: jest.SpyInstance,
  messageContaining: string
): void {
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(messageContaining)
  );
}

function createConsoleSpy(
  method: "error" | "warn" = "error"
): jest.SpyInstance {
  return jest.spyOn(console, method).mockImplementation();
}

describe("Message Processors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("processPostMessage", () => {
    const mockPost: Post = {
      id: "post-1",
      content: "Test post content",
      author: "user-1",
      boardId: "board-1",
      type: PostType.went_well,
      voteCount: 5,
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    describe("POST_ADD events", () => {
      it("should add post for valid POST_ADD message", () => {
        const messageData: PostMessageData = mockPost;

        processPostMessage(EVENT_TYPE.POST.ADD, messageData, "user-2");

        expect(mockPostSignals.addPost).toHaveBeenCalledWith(mockPost);
        expect(mockPostSignals.addPost).toHaveBeenCalledTimes(1);
      });

      it("should handle missing post data gracefully", () => {
        const messageData = null;
        const consoleSpy = createConsoleSpy();

        expectNotToThrow(() =>
          processPostMessage(EVENT_TYPE.POST.ADD, messageData, "user-2")
        );

        expect(mockPostSignals.addPost).not.toHaveBeenCalled();
        expectConsoleError(consoleSpy, "Invalid post data for ADD");
        consoleSpy.mockRestore();
      });
    });

    describe("POST_UPDATE_CONTENT events", () => {
      it("should update post content for valid message", () => {
        const messageData = {
          id: "post-1",
          content: "Updated content",
        };

        processPostMessage(
          EVENT_TYPE.POST.UPDATE_CONTENT,
          messageData,
          "user-2"
        );

        expect(mockPostSignals.updatePostContent).toHaveBeenCalledWith(
          "post-1",
          "Updated content"
        );
      });

      it("should not update if id is missing", () => {
        const messageData = {
          content: "Updated content",
          // missing id
        } as Partial<PostMessageData>;
        const consoleSpy = createConsoleSpy();

        processPostMessage(
          EVENT_TYPE.POST.UPDATE_CONTENT,
          messageData,
          "user-2"
        );

        expect(mockPostSignals.updatePostContent).not.toHaveBeenCalled();
        expectConsoleError(consoleSpy, "Invalid post data for UPDATE_CONTENT");
        consoleSpy.mockRestore();
      });
    });

    describe("POST_UPDATE_TYPE events", () => {
      it("should update post type for valid message", () => {
        const messageData = {
          id: "post-1",
          type: PostType.to_improvement,
        };

        processPostMessage(EVENT_TYPE.POST.UPDATE_TYPE, messageData, "user-2");

        expect(mockPostSignals.updatePostType).toHaveBeenCalledWith(
          "post-1",
          PostType.to_improvement
        );
      });
    });

    describe("POST_DELETE events", () => {
      it("should remove post for valid message", () => {
        const messageData = { id: "post-1" };

        processPostMessage(EVENT_TYPE.POST.DELETE, messageData, "user-2");

        expect(mockPostSignals.removePost).toHaveBeenCalledWith("post-1");
      });
    });

    describe("Vote events", () => {
      const currentUserId = "user-1";
      const otherUserId = "user-2";
      const currentTime = Date.parse("2026-10-02T00:00:00Z");

      beforeEach(() => {
        jest.setSystemTime(currentTime);
      });

      it.each([
        {
          eventType: EVENT_TYPE.POST.UPVOTE,
          operation: "upvote",
          handler: mockPostSignals.incrementPostVoteCount,
        },
        {
          eventType: EVENT_TYPE.POST.DOWNVOTE,
          operation: "downvote",
          handler: mockPostSignals.decrementPostVoteCount,
        },
      ])(
        "accepts $operation at 30 seconds and ignores it one millisecond later",
        ({ eventType, operation, handler }) => {
          const message = {
            id: "post-1",
            operation,
            userId: otherUserId,
            timestamp: currentTime - 30_000,
          };

          processPostMessage(eventType, message, currentUserId);
          expect(handler).toHaveBeenCalledWith("post-1");
          expect(handler).toHaveBeenCalledTimes(1);

          jest.advanceTimersByTime(1);
          processPostMessage(eventType, message, currentUserId);
          expect(handler).toHaveBeenCalledTimes(1);
        }
      );

      describe("POST_UPVOTE events", () => {
        it("should increment vote count for other user's vote", () => {
          const messageData: VoteMessageData = {
            id: "post-1",
            operation: "upvote",
            userId: otherUserId,
            timestamp: currentTime,
          };

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).toHaveBeenCalledWith(
            "post-1"
          );
        });

        it("should ignore own vote to prevent double-counting", () => {
          const messageData: VoteMessageData = {
            id: "post-1",
            operation: "upvote",
            userId: currentUserId,
            timestamp: currentTime,
          };

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
        });

        it("should handle missing timestamp gracefully", () => {
          const messageData = {
            id: "post-1",
            operation: "upvote",
            userId: otherUserId,
            // no timestamp
          };
          const consoleSpy = createConsoleSpy();

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
          expectConsoleError(consoleSpy, "Invalid vote data");
          consoleSpy.mockRestore();
        });

        it("should handle missing id gracefully", () => {
          const messageData = {
            operation: "upvote" as const,
            userId: otherUserId,
            timestamp: currentTime,
            // no id
          } as Partial<VoteMessageData>;
          const consoleSpy = createConsoleSpy();

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
          expectConsoleError(consoleSpy, "Invalid vote data");
          consoleSpy.mockRestore();
        });
      });

      describe("POST_DOWNVOTE events", () => {
        it("should decrement vote count for other user's vote", () => {
          const messageData: VoteMessageData = {
            id: "post-1",
            operation: "downvote",
            userId: otherUserId,
            timestamp: currentTime,
          };

          processPostMessage(
            EVENT_TYPE.POST.DOWNVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.decrementPostVoteCount).toHaveBeenCalledWith(
            "post-1"
          );
        });

        it("should ignore own downvote", () => {
          const messageData: VoteMessageData = {
            id: "post-1",
            operation: "downvote",
            userId: currentUserId,
            timestamp: currentTime,
          };

          processPostMessage(
            EVENT_TYPE.POST.DOWNVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.decrementPostVoteCount).not.toHaveBeenCalled();
        });
      });
    });

    describe("Unknown event types", () => {
      it("should handle unknown event types gracefully", () => {
        const consoleSpy = createConsoleSpy("warn");

        processPostMessage("UNKNOWN_EVENT", {}, "user-1");

        expectConsoleWarn(consoleSpy, "Unknown post event type: UNKNOWN_EVENT");
        consoleSpy.mockRestore();
      });
    });
  });

  describe("processTaskMessage", () => {
    const mockTask: Task = {
      id: "task-1",
      postId: "post-1",
      boardId: "board-1",
      userId: "user-1",
      state: TaskState.pending,
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date("2023-01-01"),
    };

    describe("ACTION_CREATE events", () => {
      it("should add task for valid message", () => {
        const messageData: TaskMessageData = mockTask;

        processTaskMessage(EVENT_TYPE.ACTION.CREATE, messageData);

        expect(mockTaskSignals.addPostTask).toHaveBeenCalledWith({
          id: mockTask.id,
          postId: mockTask.postId,
          boardId: mockTask.boardId,
        });
      });

      it("should handle missing task data gracefully", () => {
        const messageData = null;
        const consoleSpy = createConsoleSpy();

        expect(() => {
          processTaskMessage(EVENT_TYPE.ACTION.CREATE, messageData);
        }).not.toThrow();

        expect(mockTaskSignals.addPostTask).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid task data for CREATE"),
          expect.objectContaining({ details: expect.any(Array) })
        );
        consoleSpy.mockRestore();
      });
    });

    describe("ACTION_ASSIGN events", () => {
      it("should assign task for valid message", () => {
        const messageData = {
          postId: "post-1",
          userId: "user-2",
        };

        processTaskMessage(EVENT_TYPE.ACTION.ASSIGN, messageData);

        expect(mockTaskSignals.assignTask).toHaveBeenCalledWith(
          "post-1",
          "user-2"
        );
      });

      it("should handle null userId", () => {
        const messageData = {
          postId: "post-1",
          userId: null,
        };

        processTaskMessage(EVENT_TYPE.ACTION.ASSIGN, messageData);

        expect(mockTaskSignals.assignTask).toHaveBeenCalledWith("post-1", null);
      });
    });

    describe("ACTION_STATE_UPDATE events", () => {
      it("should update task state for valid message", () => {
        const messageData = {
          postId: "post-1",
          state: TaskState.completed,
        };

        processTaskMessage(EVENT_TYPE.ACTION.STATE_UPDATE, messageData);

        expect(mockTaskSignals.updatePostState).toHaveBeenCalledWith(
          "post-1",
          TaskState.completed
        );
      });
    });

    describe("Unknown event types", () => {
      it("should handle unknown task event types gracefully", () => {
        const consoleSpy = createConsoleSpy("warn");

        processTaskMessage("UNKNOWN_TASK_EVENT", {});

        expect(consoleSpy).toHaveBeenCalledWith(
          "Unknown task event type: UNKNOWN_TASK_EVENT"
        );
        consoleSpy.mockRestore();
      });
    });
  });

  describe("createMessageProcessor", () => {
    it("should create processor with validation and error handling", () => {
      const mockValidator = jest
        .fn()
        .mockReturnValue({ success: true, data: { test: "data" } });
      const mockHandler = jest.fn();
      const mockErrorHandler = jest.fn();

      const processor = createMessageProcessor({
        validate: mockValidator,
        process: mockHandler,
        onError: mockErrorHandler,
      });

      processor("test-event", "raw-data", "user-1");

      expect(mockValidator).toHaveBeenCalledWith("raw-data");
      expect(mockHandler).toHaveBeenCalledWith(
        "test-event",
        { test: "data" },
        "user-1"
      );
      expect(mockErrorHandler).not.toHaveBeenCalled();
    });

    it("should handle validation errors", () => {
      const mockValidator = jest.fn().mockReturnValue({
        success: false,
        error: { message: "Invalid data" },
      });
      const mockHandler = jest.fn();
      const mockErrorHandler = jest.fn();

      const processor = createMessageProcessor({
        validate: mockValidator,
        process: mockHandler,
        onError: mockErrorHandler,
      });

      processor("test-event", "invalid-data", "user-1");

      expect(mockValidator).toHaveBeenCalledWith("invalid-data");
      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid data" }),
        "test-event",
        "invalid-data"
      );
    });

    it("should handle processing errors", () => {
      const mockValidator = jest
        .fn()
        .mockReturnValue({ success: true, data: { test: "data" } });
      const mockHandler = jest.fn().mockImplementation(() => {
        throw new Error("Processing failed");
      });
      const mockErrorHandler = jest.fn();

      const processor = createMessageProcessor({
        validate: mockValidator,
        process: mockHandler,
        onError: mockErrorHandler,
      });

      processor("test-event", "valid-data", "user-1");

      expect(mockValidator).toHaveBeenCalledWith("valid-data");
      expect(mockHandler).toHaveBeenCalledWith(
        "test-event",
        { test: "data" },
        "user-1"
      );
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Processing failed" }),
        "test-event",
        "valid-data"
      );
    });
  });
});

describe("public message processor factories", () => {
  const now = Date.parse("2026-10-03T00:00:00Z");
  const post = {
    id: "target",
    content: "Merged content",
    type: PostType.went_well,
    author: null,
    boardId: "board-a",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each(["object", "json"])(
    "adds validated %s posts with the default vote count",
    (format) => {
      createPostMessageProcessor()(
        EVENT_TYPE.POST.ADD,
        format === "json" ? JSON.stringify(post) : post,
        "viewer"
      );
      expect(mockPostSignals.addPost).toHaveBeenCalledWith({
        ...post,
        voteCount: 0,
      });
    }
  );

  it.each(["{", "[]", "null", null, [], 42, {}])(
    "rejects invalid data %p without changing post or task state",
    (data) => {
      createPostMessageProcessor()(EVENT_TYPE.POST.ADD, data, "viewer");
      createTaskMessageProcessor()(EVENT_TYPE.ACTION.CREATE, data, "viewer");
      expect(mockPostSignals.addPost).not.toHaveBeenCalled();
      expect(mockTaskSignals.addPostTask).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    }
  );

  it.each([
    { age: 30_000, applied: 1 },
    { age: 30_001, applied: 0 },
  ])("applies $applied merge events at age $age", ({ age, applied }) => {
    const message = {
      targetPostId: "target",
      sourcePostIds: ["source"],
      mergedPost: post,
      uniqueVoteCount: 0,
      deletedPostIds: ["source"],
      timestamp: now - age,
    };
    createPostMessageProcessor()(
      EVENT_TYPE.POST.MERGE,
      JSON.stringify(message),
      "viewer"
    );
    expect(mockPostSignals.updatePost).toHaveBeenCalledTimes(applied);
    expect(mockPostSignals.removePost).toHaveBeenCalledTimes(applied);
    if (applied) {
      expect(mockPostSignals.updatePost).toHaveBeenCalledWith("target", {
        ...post,
        voteCount: 0,
      });
      expect(mockPostSignals.removePost).toHaveBeenCalledWith("source");
    }
  });

  it("rejects a merge with an invalid embedded post before deleting sources", () => {
    createPostMessageProcessor()(
      EVENT_TYPE.POST.MERGE,
      {
        targetPostId: "target",
        sourcePostIds: ["source"],
        mergedPost: { ...post, content: "" },
        uniqueVoteCount: 0,
        deletedPostIds: ["source"],
        timestamp: now,
      },
      "viewer"
    );
    expect(mockPostSignals.updatePost).not.toHaveBeenCalled();
    expect(mockPostSignals.removePost).not.toHaveBeenCalled();
  });

  it.each(["object", "json"])(
    "accepts task state zero in %s data",
    (format) => {
      const message = { postId: "target", state: TaskState.pending };
      createTaskMessageProcessor()(
        EVENT_TYPE.ACTION.STATE_UPDATE,
        format === "json" ? JSON.stringify(message) : message,
        "viewer"
      );
      expect(mockTaskSignals.updatePostState).toHaveBeenCalledWith(
        "target",
        TaskState.pending
      );
    }
  );

  it.each([
    { data: { postId: "target", id: "task" }, event: EVENT_TYPE.ACTION.CREATE },
    {
      data: { postId: "target", boardId: "board-a" },
      event: EVENT_TYPE.ACTION.CREATE,
    },
    { data: { postId: "target" }, event: EVENT_TYPE.ACTION.STATE_UPDATE },
  ])("rejects required task fields missing from $data", ({ event, data }) => {
    createTaskMessageProcessor()(event, data, "viewer");
    expect(mockTaskSignals.addPostTask).not.toHaveBeenCalled();
    expect(mockTaskSignals.updatePostState).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("keeps unknown-event warnings and contains a handler failure", () => {
    createPostMessageProcessor()("UNKNOWN_POST", {}, "viewer");
    createTaskMessageProcessor()("UNKNOWN_TASK", {}, "viewer");
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(mockPostSignals.addPost).not.toHaveBeenCalled();
    expect(mockTaskSignals.addPostTask).not.toHaveBeenCalled();
    mockPostSignals.addPost.mockImplementationOnce(() => {
      throw new Error("handler failed");
    });
    createPostMessageProcessor()(EVENT_TYPE.POST.ADD, post, "viewer");
    expect(console.error).toHaveBeenCalledWith(
      "handler failed",
      expect.objectContaining({ eventType: EVENT_TYPE.POST.ADD })
    );
  });
});
