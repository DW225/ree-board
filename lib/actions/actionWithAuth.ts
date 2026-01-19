import { Role, hasRequiredRole } from "@/lib/constants/role";
import { verifySession } from "@/lib/dal";
import { checkMemberRole } from "@/lib/db/member";
import {
  InsufficientRoleError,
  NotBoardMemberError,
} from "@/lib/errors/ServerActionErrors";
import type { Board } from "@/lib/types/board";
import type { User } from "@/lib/types/user";
import { logger } from "@/lib/utils/logger";

/**
 * Wrapper for Server Actions that require authentication
 *
 * This function verifies the user's session before executing the action.
 * It uses the centralized DAL for consistent auth checks across all actions.
 *
 * @param action - The async function to execute after auth verification
 * @returns The result of the action
 * @throws AuthenticationError if user is not authenticated (via verifySession redirect)
 *
 * @example
 * export async function createPost(formData: FormData) {
 *   return actionWithAuth(async (userId) => {
 *     // Your action logic here with authenticated userId
 *   })
 * }
 */
export async function actionWithAuth<T>(
  action: (userId: User["id"]) => Promise<T>,
): Promise<T> {
  // Verify session using centralized DAL
  // This will redirect to login if not authenticated (throws)
  const session = await verifySession();

  logger.debug("Action authenticated", { userId: session.userId });

  return await action(session.userId);
}

/**
 * Role-Based Access Control wrapper for Server Actions
 *
 * Verifies authentication, board membership, and role before executing action.
 * Throws typed errors for better error handling and logging.
 *
 * @param boardId - Board ID to check membership and role
 * @param minRole - Minimum role required (default: Role.member, no guests)
 * @param action - The async function to execute after RBAC checks
 * @returns The result of the action
 * @throws AuthenticationError if user is not authenticated
 * @throws NotBoardMemberError if user is not a member of the board
 * @throws InsufficientRoleError if user doesn't have required role
 *
 * @example
 * export const createPost = async (post: NewPost) =>
 *   rbacWithAuth(post.boardId, async (userId, role) => {
 *     // User is authenticated, is a board member, and has member+ role
 *     await createPostInDB(post);
 *   }, Role.member);
 */
export async function rbacWithAuth<T>(
  boardId: Board["id"],
  action: (userId: User["id"], role: Role) => Promise<T>,
  minRole: Role = Role.member, // Default: members and owners (no guests)
): Promise<T> {
  // Verify session using centralized DAL
  const session = await verifySession();
  const userId = session.userId;

  logger.debug("RBAC check started", { userId, boardId, minRole });

  // Check if user is a member of the board
  const userRole = await checkMemberRole(userId, boardId);

  if (userRole === null) {
    throw new NotBoardMemberError(userId, boardId);
  }

  // Check if user has sufficient role
  if (!hasRequiredRole(userRole, minRole)) {
    throw new InsufficientRoleError(Role[minRole], Role[userRole], {
      userId,
      boardId,
    });
  }

  logger.debug("RBAC check passed", { userId, boardId, userRole, minRole });

  return await action(userId, userRole);
}

/**
 * Simple RBAC wrapper that only checks board membership
 * Allows any member (including guests) to perform the action
 *
 * @param boardId - Board ID to check membership
 * @param action - The async function to execute after membership check
 * @returns The result of the action
 * @throws AuthenticationError if user is not authenticated
 * @throws NotBoardMemberError if user is not a member of the board
 *
 * @example
 * export const viewPost = async (postId: string, boardId: string) =>
 *   rbacMemberOnly(boardId, async (userId, role) => {
 *     // User is a member (could be guest, member, or owner)
 *     return await getPostFromDB(postId);
 *   });
 */
export async function rbacMemberOnly<T>(
  boardId: Board["id"],
  action: (userId: User["id"], role: Role) => Promise<T>,
): Promise<T> {
  return rbacWithAuth(boardId, action, Role.guest);
}
