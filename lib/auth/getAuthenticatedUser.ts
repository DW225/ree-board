import { createClient as createSupabaseClient } from "@/lib/utils/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/user";
import { retryWithBackoff } from "@/lib/utils/retryWithBackoff";

/**
 * Result type for authenticated user lookup
 * Returns user ID and guest status, or null if not authenticated
 */
export type AuthResult = {
  userId: string;
  isGuest: boolean;
} | null;

/**
 * Gets the authenticated user from Supabase and looks up their internal user record.
 *
 * This is the unified authentication helper that should be used across the application
 * to determine if a user is authenticated and retrieve their internal user ID.
 *
 * Implements retry logic with exponential backoff to handle transient failures from
 * external services (Supabase Auth) and database operations.
 *
 * @returns AuthResult containing userId and isGuest flag, or null if not authenticated
 *
 * @example
 * ```typescript
 * const authResult = await getAuthenticatedUser();
 * if (!authResult) {
 *   redirect("/sign-in");
 * }
 * // Use authResult.userId for database operations
 * // Check authResult.isGuest for permission logic
 * ```
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseClient();

    // Wrap Supabase auth call with retry logic for transient failures
    const user = await retryWithBackoff(
      async () => {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) return null;
        return user;
      },
      { maxRetries: 5, initialDelay: 1000 }
    );

    if (!user) return null;

    // Database lookup with retry logic
    const internalUser = await retryWithBackoff(
      async () => {
        const foundUser = await getUserBySupabaseId(user.id);
        if (!foundUser) {
          throw new Error(
            `User not found in database for Supabase ID: ${user.id}`
          );
        }
        return foundUser;
      },
      { maxRetries: 3, initialDelay: 500 }
    );

    return {
      userId: internalUser.id,
      isGuest: internalUser.isGuest || false,
    };
  } catch (error) {
    console.error("Authentication failed:", {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return null; // Graceful degradation - redirect to login
  }
}
