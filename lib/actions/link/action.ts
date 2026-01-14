"use server";

import { findValidLinkByToken } from "@/lib/db/link";
import {
  addMember,
  checkIfMemberExists,
  getBoardCountForUser,
} from "@/lib/db/member";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { nanoid } from "nanoid";
import type { MagicLinkUsageResult } from "@/lib/types/link";
import { Role } from "@/lib/constants/role";
import { z } from "zod";

/**
 * Server action to handle magic link usage
 * This is called when a user clicks on a magic link
 * Supports both authenticated users and guests
 *
 * Returns a result object instead of using redirect() to allow client-side navigation
 */
export async function processMagicLinkAction(rawToken: string): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  const token = z
    .string()
    .min(1, "Magic link token is required")
    .safeParse(rawToken);
  if (!token.success) {
    return {
      success: false,
      redirectUrl: "/invite/error?reason=invalid_token",
      error: "Invalid token format"
    };
  }

  // Check if user is authenticated (could be guest or regular user)
  const authResult = await getAuthenticatedUser();

  if (!authResult) {
    return {
      success: false,
      redirectUrl: "/invite/error?reason=authentication_failed",
      error: "Authentication failed"
    };
  }

  // Find the magic link
  const link = await findValidLinkByToken(token.data);
  if (!link) {
    return {
      success: false,
      redirectUrl: "/invite/error?reason=invalid_or_expired",
      error: "Link not found or expired"
    };
  }

  // Check if user is already a member of the board
  const isAlreadyMember = await checkIfMemberExists(
    authResult.userId,
    link.boardId
  );
  if (isAlreadyMember) {
    // User is already a member - redirect directly to board
    return {
      success: true,
      redirectUrl: `/board/${link.boardId}`
    };
  }

  // Enforce one-board limit for guest users
  if (authResult.isGuest) {
    const boardCount = await getBoardCountForUser(authResult.userId);
    if (boardCount > 0) {
      // Guest already in another board - redirect to upgrade prompt
      return {
        success: false,
        redirectUrl: "/invite/error?reason=guest_limit_reached",
        error: "Guest limit reached"
      };
    }
  }

  // Add user to board with the specified role
  await addMember({
    id: nanoid(),
    userId: authResult.userId,
    boardId: link.boardId,
    role: link.role,
  });

  // Return success with board URL
  return {
    success: true,
    redirectUrl: `/board/${link.boardId}`
  };
}

const MagicLinkTokenSchema = z.string().min(1, "Magic link token is required");

/**
 * Server action to validate a magic link without using it
 * Useful for previewing link information before joining
 */
export async function validateMagicLinkAction(
  rawToken: string
): Promise<MagicLinkUsageResult> {
  try {
    // Find the magic link
    const token = MagicLinkTokenSchema.parse(rawToken);
    const link = await findValidLinkByToken(token);
    if (!link) {
      return {
        success: false,
        error: "LINK_NOT_FOUND",
        message: "This invitation link is invalid or has expired.",
      };
    }

    // Check authentication
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return {
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Please sign in to join this board.",
        redirectUrl: `/invite/${token}`,
      };
    }

    // Check if user is already a member
    const isAlreadyMember = await checkIfMemberExists(
      authResult.userId,
      link.boardId
    );
    if (isAlreadyMember) {
      return {
        success: false,
        error: "USER_ALREADY_MEMBER",
        message: "You are already a member of this board.",
        boardId: link.boardId,
        redirectUrl: `/board/${link.boardId}`,
      };
    }

    // Check if guest user is trying to join another board
    if (authResult.isGuest) {
      const boardCount = await getBoardCountForUser(authResult.userId);
      if (boardCount > 0) {
        return {
          success: false,
          error: "GUEST_LIMIT_REACHED",
          message:
            "Guest accounts can only join one board. Upgrade your account to join more boards.",
        };
      }
    }

    // Link is valid and user can join
    return {
      success: true,
      boardId: link.boardId,
      message: `You will be added to "${link.boardTitle}" as a ${link.role === Role.member ? "member" : "guest"}.`,
    };
  } catch (error) {
    console.error("Error validating magic link:", error);
    return {
      success: false,
      error: "INVALID_TOKEN",
      message: "An error occurred while validating the invitation link.",
    };
  }
}

/**
 * Server action to get magic link information for preview
 * Returns basic info about the board and role without authentication checks
 */
export async function getMagicLinkInfoAction(rawToken: string) {
  try {
    const token = MagicLinkTokenSchema.parse(rawToken);
    const link = await findValidLinkByToken(token);
    if (!link) {
      return null;
    }

    return {
      boardTitle: link.boardTitle,
      role: link.role,
      isExpired: false // Since we use findValidLinkByToken, it's not expired
    };
  } catch (error) {
    console.error("Error getting magic link info:", error);
    return null;
  }
}
