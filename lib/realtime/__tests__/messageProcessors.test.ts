import { PostType } from "@/lib/constants/post";
import { TaskState } from "@/lib/constants/task";
import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";

// Mock the ably utilities module
jest.mock("@/lib/utils/ably", () => ({
  EVENT_TYPE: {
    POST: {
      ADD: "POST_ADD",
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
  MESSAGE_STALENESS_THRESHOLD,
  processPostMessage,
  processTaskMessage,
  type PostMessageData,
  type TaskMessageData,
  type VoteMessageData,
} from "../messageProcessors";

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
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        expect(() => {
          processPostMessage(EVENT_TYPE.POST.ADD, messageData, "user-2");
        }).not.toThrow();

        expect(mockPostSignals.addPost).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid post data for ADD"),
          expect.objectContaining({ details: expect.any(Array) })
        );
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
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        processPostMessage(
          EVENT_TYPE.POST.UPDATE_CONTENT,
          messageData,
          "user-2"
        );

        expect(mockPostSignals.updatePostContent).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Invalid post data for UPDATE_CONTENT"),
          expect.objectContaining({ details: expect.any(Array) })
        );
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
      const currentTime = Date.now();

      beforeEach(() => {
        jest.setSystemTime(currentTime);
      });

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

        it("should ignore stale messages (>30 seconds old)", () => {
          const staleTimestamp = currentTime - 35000; // 35 seconds ago
          const messageData: VoteMessageData = {
            id: "post-1",
            operation: "upvote",
            userId: otherUserId,
            timestamp: staleTimestamp,
          };

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
        });

        it("should process recent messages (within 30 seconds)", () => {
          const recentTimestamp = currentTime - 25000; // 25 seconds ago
          const messageData: VoteMessageData = {
            id: "post-1",
            operation: "upvote",
            userId: otherUserId,
            timestamp: recentTimestamp,
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

        it("should handle missing timestamp gracefully", () => {
          const messageData = {
            id: "post-1",
            operation: "upvote",
            userId: otherUserId,
            // no timestamp
          };
          const consoleSpy = jest.spyOn(console, "error").mockImplementation();

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid vote data"),
            expect.objectContaining({ details: expect.any(Array) })
          );
          consoleSpy.mockRestore();
        });

        it("should handle missing id gracefully", () => {
          const messageData = {
            operation: "upvote" as const,
            userId: otherUserId,
            timestamp: currentTime,
            // no id
          } as Partial<VoteMessageData>;
          const consoleSpy = jest.spyOn(console, "error").mockImplementation();

          processPostMessage(
            EVENT_TYPE.POST.UPVOTE,
            messageData,
            currentUserId
          );

          expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Invalid vote data"),
            expect.objectContaining({ details: expect.any(Array) })
          );
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
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        processPostMessage("UNKNOWN_EVENT", {}, "user-1");

        expect(consoleSpy).toHaveBeenCalledWith(
          "Unknown post event type: UNKNOWN_EVENT"
        );
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
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

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
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

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

  describe("Message staleness configuration", () => {
    it("should use configurable staleness threshold", () => {
      // This test ensures we use the exported constant
      const currentTime = Date.now();

      jest.setSystemTime(currentTime);

      const staleTimestamp = currentTime - MESSAGE_STALENESS_THRESHOLD - 1000;
      const messageData: VoteMessageData = {
        id: "post-1",
        operation: "upvote",
        userId: "other-user",
        timestamp: staleTimestamp,
      };

      processPostMessage(EVENT_TYPE.POST.UPVOTE, messageData, "current-user");

      expect(mockPostSignals.incrementPostVoteCount).not.toHaveBeenCalled();
    });
  });
});
