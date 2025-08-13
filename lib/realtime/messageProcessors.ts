import {
  addPost,
  addPostTask,
  assignTask,
  decrementPostVoteCount,
  incrementPostVoteCount,
  removePost,
  updatePost,
  updatePostContent,
  updatePostState,
  updatePostType,
} from "@/lib/signal/postSignals";
import type { Post } from "@/lib/types/post";
import { EVENT_TYPE } from "@/lib/utils/ably";
import { z } from "zod";
import type {
  MessageProcessor,
  MessageProcessorConfig,
  PostMergeMessageData,
  PostMessageData,
  ProcessingError,
  TaskMessageData,
  ValidationResult,
  VoteMessageData,
} from "./types";
import { ErrorRecoveryStrategy } from "./types";

/**
 * Message staleness threshold - messages older than this are ignored
 */
export const MESSAGE_STALENESS_THRESHOLD = 30_000; // 30 seconds

/**
 * Zod schemas for message validation
 */
const PostMessageSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
  content: z.string().min(1, "Post content is required"),
  type: z
    .number()
    .int()
    .nonnegative("Post type must be a non-negative integer"),
  author: z.string().nullable(),
  boardId: z.string().min(1, "Board ID is required"),
  voteCount: z
    .number()
    .int()
    .nonnegative("Vote count must be non-negative")
    .default(0),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

/**
 * Schema for partial post updates (only requires ID)
 */
const PartialPostMessageSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
  content: z.string().optional(),
  type: z.number().int().nonnegative().optional(),
  author: z.string().nullable().optional(),
  boardId: z.string().optional(),
  voteCount: z.number().int().nonnegative().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

const VoteMessageSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
  operation: z.enum(["upvote", "downvote"], {
    errorMap: () => ({ message: "Operation must be 'upvote' or 'downvote'" }),
  }),
  userId: z.string().min(1, "User ID is required"),
  timestamp: z.number().positive("Timestamp must be positive"),
});

const TaskMessageSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  id: z.string().optional(),
  boardId: z.string().optional(),
  userId: z.string().nullable().optional(),
  state: z.number().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

const PostMergeMessageSchema = z.object({
  targetPostId: z.string().min(1, "Target post ID is required"),
  sourcePostIds: z
    .array(z.string().min(1, "Source post ID is required"))
    .min(1, "At least one source post ID is required"),
  mergedPost: PostMessageSchema,
  uniqueVoteCount: z
    .number()
    .int()
    .nonnegative("Unique vote count must be non-negative"),
  deletedPostIds: z.array(z.string().min(1, "Deleted post ID is required")),
  timestamp: z.number().positive("Timestamp must be positive"),
});

/**
 * Type predicate to check if data is a string
 */
function isString(data: unknown): data is string {
  return typeof data === "string";
}

/**
 * Type predicate to check if data is a non-null object
 */
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

/**
 * Safely handles both string and object data by parsing if necessary
 */
function safeParseData<T>(data: string | unknown): ValidationResult<T> {
  // Validate that data is either string or object
  if (!isString(data) && !isObject(data)) {
    return {
      success: false,
      error: {
        message: "Invalid data type: expected string or object",
        details: `Received: ${typeof data}`,
      },
    };
  }

  if (isString(data)) {
    try {
      const parsed = JSON.parse(data);
      // Ensure parsed result is an object
      if (!isObject(parsed)) {
        return {
          success: false,
          error: {
            message: "Parsed JSON is not an object",
            details: `Parsed type: ${typeof parsed}`,
          },
        };
      }
      return { success: true, data: parsed as T };
    } catch (error) {
      return {
        success: false,
        error: {
          message: "Failed to parse JSON string",
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // If it's already a valid object, return it directly
  return { success: true, data: data as T };
}

/**
 * Type predicate to check if data is a valid post
 */
function isValidPost(data: unknown): data is Post {
  const result = PostMessageSchema.safeParse(data);
  return result.success;
}

/**
 * Validates post message data using Zod schema with type predicates
 */
function validatePostData(
  rawData: unknown,
  requireComplete = false
): ValidationResult<PostMessageData> {
  const schema = requireComplete ? PostMessageSchema : PartialPostMessageSchema;
  const result = schema.safeParse(rawData);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");

    return {
      success: false,
      error: {
        message: `Post validation failed: ${errorMessage}`,
        details: result.error.errors,
      },
    };
  }

  return { success: true, data: result.data as PostMessageData };
}

/**
 * Validates vote message data using Zod schema
 */
function validateVoteData(rawData: unknown): ValidationResult<VoteMessageData> {
  const result = VoteMessageSchema.safeParse(rawData);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");

    return {
      success: false,
      error: {
        message: `Vote validation failed: ${errorMessage}`,
        details: result.error.errors,
      },
    };
  }

  return { success: true, data: result.data as VoteMessageData };
}

/**
 * Validates task message data
 */
function validateTaskData(rawData: unknown): ValidationResult<TaskMessageData> {
  const result = TaskMessageSchema.safeParse(rawData);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");

    return {
      success: false,
      error: {
        message: `Task validation failed: ${errorMessage}`,
        details: result.error.errors,
      },
    };
  }

  return { success: true, data: result.data as TaskMessageData };
}

/**
 * Validates merge message data using Zod schema
 */
function validateMergeData(
  rawData: unknown
): ValidationResult<PostMergeMessageData> {
  const result = PostMergeMessageSchema.safeParse(rawData);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");

    return {
      success: false,
      error: {
        message: `Merge validation failed: ${errorMessage}`,
        details: result.error.errors,
      },
    };
  }

  return { success: true, data: result.data as PostMergeMessageData };
}

/**
 * Checks if a message is stale based on timestamp
 */
function isMessageStale(
  timestamp: number,
  stalenessThresholdMs: number = MESSAGE_STALENESS_THRESHOLD
): boolean {
  const messageAge = Date.now() - timestamp;
  return messageAge > stalenessThresholdMs;
}

/**
 * Creates a standardized processing error
 */
function createProcessingError(
  message: string,
  eventType: string,
  rawData: unknown,
  strategy: ErrorRecoveryStrategy = ErrorRecoveryStrategy.LOG_AND_CONTINUE,
  originalError?: Error
): ProcessingError {
  const error = originalError || new Error(message);
  return Object.assign(error, {
    eventType,
    rawData,
    strategy,
    timestamp: Date.now(),
  });
}

/**
 * Process post-related messages
 */
export function processPostMessage(
  eventType: string,
  messageData: unknown,
  currentUserId: string
): void {
  try {
    switch (eventType) {
      case EVENT_TYPE.POST.ADD: {
        const validation = validatePostData(messageData, true); // Require complete post for ADD
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid post data for ADD: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }

        // Type assertion is safe here due to validation
        if (isValidPost(validation.data)) {
          addPost(validation.data);
        } else {
          console.error("Post validation passed but type predicate failed", {
            messageData,
          });
        }
        break;
      }

      case EVENT_TYPE.POST.UPDATE_CONTENT: {
        const validation = validatePostData(messageData, false);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid post data for UPDATE_CONTENT: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }
        if (!validation.data.content) {
          const error = createProcessingError(
            "UPDATE_CONTENT requires content field",
            eventType,
            messageData
          );
          console.error(error.message);
          return;
        }
        updatePostContent(validation.data.id, validation.data.content);
        break;
      }

      case EVENT_TYPE.POST.UPDATE_TYPE: {
        const validation = validatePostData(messageData, false);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid post data for UPDATE_TYPE: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }
        if (validation.data.type === undefined) {
          const error = createProcessingError(
            "UPDATE_TYPE requires type field",
            eventType,
            messageData
          );
          console.error(error.message);
          return;
        }
        updatePostType(validation.data.id, validation.data.type);
        break;
      }

      case EVENT_TYPE.POST.DELETE: {
        const validation = validatePostData(messageData, false);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid post data for DELETE: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }
        removePost(validation.data.id);
        break;
      }

      case EVENT_TYPE.POST.UPVOTE:
      case EVENT_TYPE.POST.DOWNVOTE: {
        const validation = validateVoteData(messageData);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid vote data: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }

        const voteData = validation.data;

        // Ignore own actions to prevent double-counting
        if (voteData.userId === currentUserId) {
          return;
        }

        // Check if message is stale
        if (isMessageStale(voteData.timestamp)) {
          return;
        }

        // Apply the vote operation
        if (eventType === EVENT_TYPE.POST.UPVOTE) {
          incrementPostVoteCount(voteData.id);
        } else {
          decrementPostVoteCount(voteData.id);
        }
        break;
      }

      case EVENT_TYPE.POST.MERGE: {
        const validation = validateMergeData(messageData);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid merge data: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }

        const mergeData = validation.data;

        // Check if message is stale
        if (isMessageStale(mergeData.timestamp)) {
          return;
        }

        // Update the target post with merged data
        if (isValidPost(mergeData.mergedPost)) {
          updatePost(mergeData.targetPostId, mergeData.mergedPost);
          // Remove source posts from state
          mergeData.deletedPostIds.forEach((postId) => {
            removePost(postId);
          });
        } else {
          console.error("Merged post validation failed", {
            mergedPost: mergeData.mergedPost,
          });
        }

        break;
      }

      default: {
        const unknownError = createProcessingError(
          `Unknown post event type: ${eventType}`,
          eventType,
          messageData
        );
        console.warn(unknownError.message);
      }
    }
  } catch (error) {
    const processingError = createProcessingError(
      "Unexpected error processing post message",
      eventType,
      messageData,
      ErrorRecoveryStrategy.LOG_AND_CONTINUE,
      error instanceof Error ? error : undefined
    );
    console.error(processingError.message, {
      originalError: error,
      eventType,
      messageData,
      currentUserId,
    });
  }
}

/**
 * Process task-related messages
 */
export function processTaskMessage(
  eventType: string,
  messageData: unknown
): void {
  try {
    switch (eventType) {
      case EVENT_TYPE.ACTION.CREATE: {
        const validation = validateTaskData(messageData);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid task data for CREATE: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }

        const taskData = validation.data;
        if (!taskData.id || !taskData.boardId) {
          const error = createProcessingError(
            "Task CREATE requires id and boardId",
            eventType,
            messageData
          );
          console.error(error.message);
          return;
        }

        addPostTask({
          id: taskData.id,
          postId: taskData.postId,
          boardId: taskData.boardId,
        });
        break;
      }

      case EVENT_TYPE.ACTION.ASSIGN: {
        const validation = validateTaskData(messageData);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid task data for ASSIGN: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }

        const taskData = validation.data;
        assignTask(taskData.postId, taskData.userId ?? null);
        break;
      }

      case EVENT_TYPE.ACTION.STATE_UPDATE: {
        const validation = validateTaskData(messageData);
        if (!validation.success) {
          const error = createProcessingError(
            `Invalid task data for STATE_UPDATE: ${validation.error.message}`,
            eventType,
            messageData
          );
          console.error(error.message, { details: validation.error.details });
          return;
        }

        const taskData = validation.data;
        if (taskData.state === undefined) {
          const error = createProcessingError(
            "Task STATE_UPDATE requires state field",
            eventType,
            messageData
          );
          console.error(error.message);
          return;
        }

        updatePostState(taskData.postId, taskData.state);
        break;
      }

      default: {
        const unknownError = createProcessingError(
          `Unknown task event type: ${eventType}`,
          eventType,
          messageData
        );
        console.warn(unknownError.message);
      }
    }
  } catch (error) {
    const processingError = createProcessingError(
      "Unexpected error processing task message",
      eventType,
      messageData,
      ErrorRecoveryStrategy.LOG_AND_CONTINUE,
      error instanceof Error ? error : undefined
    );
    console.error(processingError.message, {
      originalError: error,
      eventType,
      messageData,
    });
  }
}

/**
 * Creates a generic message processor with validation and error handling
 */
export function createMessageProcessor<TInput, TOutput>(
  config: MessageProcessorConfig<TInput, TOutput>
): MessageProcessor<TInput> {
  return (eventType: string, rawData: TInput, currentUserId: string): void => {
    try {
      // Validate the raw data
      const validation = config.validate(rawData);
      if (!validation.success) {
        const processingError = createProcessingError(
          validation.error?.message || "Validation failed",
          eventType,
          rawData
        );

        if (config.onError) {
          config.onError(processingError, eventType, rawData);
        }
        return;
      }

      // Process the validated data
      config.process(eventType, validation.data, currentUserId);
    } catch (error) {
      const processingError = createProcessingError(
        "Processing error in message processor",
        eventType,
        rawData,
        ErrorRecoveryStrategy.LOG_AND_CONTINUE,
        error instanceof Error ? error : undefined
      );

      if (config.onError) {
        config.onError(processingError, eventType, rawData);
      }
    }
  };
}

/**
 * Creates a post message processor with default error handling
 */
export function createPostMessageProcessor(): MessageProcessor<
  string | unknown
> {
  return createMessageProcessor({
    validate: safeParseData,
    process: (eventType, data, currentUserId) => {
      processPostMessage(eventType, data, currentUserId);
    },
    onError: (error, eventType, rawData) => {
      const timestamp =
        "timestamp" in error && typeof error.timestamp === "number"
          ? error.timestamp
          : Date.now();
      console.error(
        `Post message processing error [${eventType}]:`,
        error.message,
        {
          rawData,
          timestamp: new Date(timestamp).toISOString(),
        }
      );
    },
  });
}

/**
 * Creates a task message processor with default error handling
 */
export function createTaskMessageProcessor(): MessageProcessor<
  string | unknown
> {
  return createMessageProcessor({
    validate: safeParseData,
    process: (eventType, data) => {
      processTaskMessage(eventType, data);
    },
    onError: (error, eventType, rawData) => {
      const timestamp =
        "timestamp" in error && typeof error.timestamp === "number"
          ? error.timestamp
          : Date.now();
      console.error(
        `Task message processing error [${eventType}]:`,
        error.message,
        {
          rawData,
          timestamp: new Date(timestamp).toISOString(),
        }
      );
    },
  });
}

/**
 * Export types for tests
 */
export type {
  MessageEnvelope,
  MessageProcessorConfig,
  PostMessageData,
  ProcessingError,
  TaskMessageData,
  ValidationResult,
  VoteMessageData
} from "./types";

