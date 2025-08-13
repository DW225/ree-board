import type { Post } from "@/lib/types/post";
import type { Task } from "@/lib/types/task";

/**
 * Generic message envelope for all real-time messages
 */
export interface MessageEnvelope<T = unknown> {
  type: string;
  data: T;
  metadata: {
    userId: string;
    timestamp: number;
    version?: string;
  };
}

/**
 * Configuration for message staleness
 */
export interface MessageConfig {
  stalenessThreshold: number; // milliseconds
}

/**
 * Default message configuration
 */
export const DEFAULT_MESSAGE_CONFIG: MessageConfig = {
  stalenessThreshold: 30_000, // 30 seconds
};

/**
 * Post-related message data types
 */
export type PostMessageData = Post | (Partial<Post> & { id: string });

/**
 * Vote-specific message data
 */
export interface VoteMessageData {
  id: string;
  operation: "upvote" | "downvote";
  userId: string;
  timestamp: number;
}

/**
 * Merge-specific message data
 */
export interface PostMergeMessageData {
  targetPostId: string;
  sourcePostIds: string[];
  mergedPost: Post;
  uniqueVoteCount: number;
  deletedPostIds: string[];
  timestamp: number;
}

/**
 * Task-related message data types
 */
export type TaskMessageData = Task | (Partial<Task> & { postId: string });

/**
 * Validation result interface
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; details?: unknown } };

/**
 * Message processor configuration
 */
export interface MessageProcessorConfig<TInput, TOutput> {
  validate: (rawData: TInput) => ValidationResult<TOutput>;
  process: (eventType: string, data: TOutput, currentUserId: string) => void;
  onError?: (error: Error, eventType: string, rawData: TInput) => void;
}

/**
 * Message processor function type
 */
export type MessageProcessor<TInput = unknown> = (
  eventType: string,
  rawData: TInput,
  currentUserId: string
) => void;

/**
 * Error recovery strategies
 */
export enum ErrorRecoveryStrategy {
  IGNORE = "ignore",
  RETRY = "retry",
  LOG_AND_CONTINUE = "log_and_continue",
  NOTIFY_USER = "notify_user",
}

/**
 * Enhanced error with recovery context
 */
export interface ProcessingError extends Error {
  eventType: string;
  rawData: unknown;
  strategy: ErrorRecoveryStrategy;
  timestamp: number;
}
