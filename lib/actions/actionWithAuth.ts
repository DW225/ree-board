import { verifySession } from "@/lib/dal";

/**
 * Wrapper for Server Actions that require authentication
 *
 * This function verifies the user's session before executing the action.
 * It uses the centralized DAL for consistent auth checks across all actions.
 *
 * @param action - The async function to execute after auth verification
 * @returns The result of the action or null if auth fails
 *
 * @example
 * export async function createPost(formData: FormData) {
 *   return actionWithAuth(async () => {
 *     const session = await verifySession()
 *     // Your action logic here
 *   })
 * }
 */
export async function actionWithAuth<T>(
  action: () => Promise<T>
): Promise<T> {
  // Verify session using centralized DAL
  // This will automatically redirect to login if not authenticated
  await verifySession();

  return await action();
}
