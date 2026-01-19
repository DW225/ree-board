import * as Sentry from "@sentry/nextjs";
import { ServerActionError } from "@/lib/errors/ServerActionErrors";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogContext {
  userId?: string;
  boardId?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error | ServerActionError;
  timestamp: string;
}

/**
 * Centralized logger with Sentry integration
 * Provides structured logging for server actions
 */
class Logger {
  private readonly isProduction = process.env.NODE_ENV === "production";
  private readonly isDevelopment = process.env.NODE_ENV === "development";
  private readonly isSentryEnabled =
    process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true";

  /**
   * Format log entry for console output
   */
  private formatLogEntry(entry: LogEntry): string {
    const { level, message, context, error, timestamp } = entry;
    const parts = [`[${timestamp}]`, `[${level.toUpperCase()}]`, message];

    if (context && Object.keys(context).length > 0) {
      parts.push(`Context: ${JSON.stringify(context)}`);
    }

    if (error) {
      parts.push(`Error: ${error.message}`);
      if (error instanceof ServerActionError) {
        parts.push(`Code: ${error.code}`);
      }
    }

    return parts.join(" | ");
  }

  /**
   * Send error to Sentry with proper context
   */
  private sendToSentry(error: Error | ServerActionError, context?: LogContext) {
    if (!this.isSentryEnabled) return;

    // Don't send operational errors to Sentry (they're expected)
    if (error instanceof ServerActionError && error.isOperational) {
      // Still log to Sentry but as a breadcrumb, not an error
      Sentry.addBreadcrumb({
        category: "server-action",
        message: error.message,
        level: "info",
        data: {
          code: error.code,
          statusCode: error.statusCode,
          context: error.context,
        },
      });
      return;
    }

    // Send non-operational errors (bugs) to Sentry
    Sentry.withScope((scope) => {
      // Add context
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, { value });
        });
      }

      // Add user context if available
      if (context?.userId && typeof context.userId === "string") {
        scope.setUser({ id: context.userId });
      }

      // Add tags for filtering
      if (error instanceof ServerActionError) {
        scope.setTag("error_code", error.code);
        scope.setTag("status_code", error.statusCode);
        scope.setContext("error_details", error.context || {});
      }

      if (context?.action && typeof context.action === "string") {
        scope.setTag("action", context.action);
      }

      if (context?.boardId && typeof context.boardId === "string") {
        scope.setTag("board_id", context.boardId);
      }

      Sentry.captureException(error);
    });
  }

  /**
   * Log a message with optional context
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | ServerActionError,
  ) {
    const entry: LogEntry = {
      level,
      message,
      context,
      error,
      timestamp: new Date().toISOString(),
    };

    // Always log to console in development
    if (this.isDevelopment) {
      const formatted = this.formatLogEntry(entry);
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
          console.error(formatted);
          if (error?.stack) {
            console.error(error.stack);
          }
          break;
      }
    }

    // In production, only log warnings and errors to console
    if (
      this.isProduction &&
      (level === LogLevel.WARN || level === LogLevel.ERROR)
    ) {
      const formatted = this.formatLogEntry(entry);
      level === LogLevel.WARN
        ? console.warn(formatted)
        : console.error(formatted);
    }

    // Send errors to Sentry
    if (error && level === LogLevel.ERROR) {
      this.sendToSentry(error, context);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(
    message: string,
    context?: LogContext,
    error?: Error | ServerActionError,
  ) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(
    message: string,
    error: Error | ServerActionError,
    context?: LogContext,
  ) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log server action execution
   */
  logAction(actionName: string, context: LogContext) {
    this.info(`Server action: ${actionName}`, {
      action: actionName,
      ...context,
    });
  }

  /**
   * Log server action error with automatic context extraction
   */
  logActionError(
    actionName: string,
    error: Error | ServerActionError,
    context?: LogContext,
  ) {
    const fullContext: LogContext = {
      action: actionName,
      ...context,
    };

    // Extract additional context from ServerActionError
    if (error instanceof ServerActionError) {
      fullContext.errorCode = error.code;
      fullContext.statusCode = error.statusCode;
      fullContext.isOperational = error.isOperational;
      if (error.context) {
        Object.assign(fullContext, error.context);
      }
    }

    this.error(`Server action failed: ${actionName}`, error, fullContext);
  }
}

// Export singleton instance
export const logger = new Logger();
