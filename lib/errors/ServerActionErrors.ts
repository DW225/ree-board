/**
 * Typed error classes for server actions
 *
 * Provides structured error information for logging and client handling.
 * All errors extend ServerActionError for consistent error handling patterns.
 */

/**
 * Base class for all server action errors
 * Provides structured error information for logging and client handling
 */
export class ServerActionError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean; // true for expected errors
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

// Authentication Errors (401)
export class AuthenticationError extends ServerActionError {
  constructor(
    message: string = "Authentication required",
    context?: Record<string, unknown>
  ) {
    super(message, "AUTHENTICATION_REQUIRED", 401, true, context);
  }
}

export class SessionExpiredError extends ServerActionError {
  constructor(
    message: string = "Session has expired",
    context?: Record<string, unknown>
  ) {
    super(message, "SESSION_EXPIRED", 401, true, context);
  }
}

// Authorization Errors (403)
export class AuthorizationError extends ServerActionError {
  constructor(
    message: string = "Access denied",
    context?: Record<string, unknown>
  ) {
    super(message, "AUTHORIZATION_DENIED", 403, true, context);
  }
}

export class InsufficientRoleError extends ServerActionError {
  constructor(
    requiredRole: string,
    userRole: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Insufficient permissions. Required: ${requiredRole}, User has: ${userRole}`,
      "INSUFFICIENT_ROLE",
      403,
      true,
      { requiredRole, userRole, ...context }
    );
  }
}

export class NotBoardMemberError extends ServerActionError {
  constructor(
    userId: string,
    boardId: string,
    context?: Record<string, unknown>
  ) {
    super(
      "User is not a member of this board",
      "NOT_BOARD_MEMBER",
      403,
      true,
      { userId, boardId, ...context }
    );
  }
}

export class GuestAccessDeniedError extends ServerActionError {
  constructor(
    message: string = "Guest users cannot perform this action",
    context?: Record<string, unknown>
  ) {
    super(message, "GUEST_ACCESS_DENIED", 403, true, context);
  }
}

// Validation Errors (400)
export class ValidationError extends ServerActionError {
  constructor(
    message: string,
    validationErrors?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, "VALIDATION_ERROR", 400, true, {
      validationErrors,
      ...context,
    });
  }
}

// Resource Errors (404)
export class ResourceNotFoundError extends ServerActionError {
  constructor(
    resourceType: string,
    resourceId: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${resourceType} not found: ${resourceId}`,
      "RESOURCE_NOT_FOUND",
      404,
      true,
      { resourceType, resourceId, ...context }
    );
  }
}

// Conflict Errors (409)
export class ConflictError extends ServerActionError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFLICT", 409, true, context);
  }
}

// Database Errors (500)
export class DatabaseError extends ServerActionError {
  constructor(
    message: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, "DATABASE_ERROR", 500, false, {
      // Database errors are NOT operational
      originalError:
        originalError instanceof Error
          ? originalError.message
          : String(originalError),
      ...context,
    });
  }
}

// External Service Errors (502/503)
export class ExternalServiceError extends ServerActionError {
  constructor(
    serviceName: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(
      `External service error: ${serviceName}`,
      "EXTERNAL_SERVICE_ERROR",
      503,
      true,
      {
        serviceName,
        originalError:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
        ...context,
      }
    );
  }
}

// Rate Limiting (429)
export class RateLimitError extends ServerActionError {
  constructor(
    message: string = "Too many requests",
    context?: Record<string, unknown>
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, true, context);
  }
}

// Generic Internal Error (500)
export class InternalServerError extends ServerActionError {
  constructor(
    message: string = "Internal server error",
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, "INTERNAL_ERROR", 500, false, {
      originalError:
        originalError instanceof Error
          ? originalError.message
          : String(originalError),
      ...context,
    });
  }
}
