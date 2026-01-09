import { z } from "zod";

/**
 * Zod schema for validating safe redirect paths.
 * Only allows relative paths starting with "/" and rejects:
 * - Absolute URLs (http://, https://)
 * - Protocol-relative URLs (//)
 * - Backslashes (path traversal attempts)
 * - javascript:, data:, file:, vbscript: protocols
 * - null or empty strings
 */
export const SafeRedirectPathSchema = z
  .string()
  .min(1, "Redirect path cannot be empty")
  .refine(
    (path) => {
      // Must start with "/" but not "//" (protocol-relative URL)
      if (!path.startsWith("/") || path.startsWith("//")) {
        return false;
      }

      // Reject backslashes (Windows path separators or escape attempts)
      if (path.includes("\\")) {
        return false;
      }

      // Reject common malicious protocol patterns
      const lowerPath = path.toLowerCase();
      if (
        lowerPath.startsWith("javascript:") ||
        lowerPath.startsWith("data:") ||
        lowerPath.startsWith("file:") ||
        lowerPath.startsWith("vbscript:") ||
        lowerPath.includes("://")
      ) {
        return false;
      }

      return true;
    },
    {
      message:
        "Invalid redirect path. Only relative paths starting with '/' are allowed.",
    }
  );

/**
 * Validates and sanitizes redirect paths to prevent open redirect vulnerabilities.
 * Uses Zod schema validation and returns a safe fallback on validation failure.
 *
 * @param path - The redirect path to validate (typically from query parameters)
 * @returns Validated path or "/board" fallback if path is null/invalid
 *
 * @example
 * getSafeRedirectPath("/dashboard") // returns "/dashboard"
 * getSafeRedirectPath("https://evil.com") // returns "/board"
 * getSafeRedirectPath("//evil.com") // returns "/board"
 * getSafeRedirectPath(null) // returns "/board"
 */
export function getSafeRedirectPath(path: string | null): string {
  const defaultPath = "/board";

  if (!path) return defaultPath;

  const result = SafeRedirectPathSchema.safeParse(path);

  if (!result.success) {
    // Log validation failure for security monitoring
    console.warn("Invalid redirect path rejected:", {
      path,
      errors: result.error.issues,
    });
    return defaultPath;
  }

  return result.data;
}