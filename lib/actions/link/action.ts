"use server";

import { findValidLinkByToken } from "@/lib/db/link";
import { addMember, checkIfMemberExists } from "@/lib/db/member";
import { getUserByKindeID } from "@/lib/db/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import type { MagicLinkUsageResult } from "@/lib/types/link";
import { Role } from "@/lib/constants/role";
import {z} from "zod";

/**
 * Server action to handle magic link usage
 * This is called when a user clicks on a magic link
 */
export async function processMagicLinkAction(rawToken: string): Promise<never> {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const token = z.string().min(1, "Magic link token is required").safeParse(rawToken);
  if (!token.success) {
    redirect("/invite/error?reason=invalid_token");
  }

  // Check if user is authenticated
  if (!(await isAuthenticated())) {
    // Redirect to login with the magic link as post-login redirect
    redirect(`/api/auth/login?post_login_redirect_url=/invite/${token.data}`);
  }

  const kindeUser = await getUser();
  if (!kindeUser?.id) {
    redirect("/invite/error?reason=authentication_failed");
  }

  // Find the magic link
  const link = await findValidLinkByToken(token.data);
  if (!link) {
    redirect("/invite/error?reason=invalid_or_expired");
  }

  // Get user from database
  const user = await getUserByKindeID(kindeUser.id);
  if (!user) {
    redirect("/invite/error?reason=user_not_found");
  }

  // Check if user is already a member of the board
  const isAlreadyMember = await checkIfMemberExists(user.id, link.boardId);
  if (isAlreadyMember) {
    // User is already a member - redirect directly to board
    redirect(`/board/${link.boardId}`);
  }

  // Add user to board with the specified role
  await addMember({
    id: nanoid(),
    userId: user.id,
    boardId: link.boardId,
    role: link.role
  });

  // Redirect to board after successful addition
  redirect(`/board/${link.boardId}`);
}

const MagicLinkTokenSchema = z.string().min(1, "Magic link token is required");

/**
 * Server action to validate a magic link without using it
 * Useful for previewing link information before joining
 */
export async function validateMagicLinkAction(rawToken: string): Promise<MagicLinkUsageResult> {
  try {
    // Find the magic link
    const token = MagicLinkTokenSchema.parse(rawToken);
    const link = await findValidLinkByToken(token);
    if (!link) {
      return {
        success: false,
        error: "LINK_NOT_FOUND",
        message: "This invitation link is invalid or has expired."
      };
    }

    // Check authentication
    const { getUser, isAuthenticated } = getKindeServerSession();
    if (!(await isAuthenticated())) {
      return {
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Please sign in to join this board.",
        redirectUrl: `/api/auth/login?post_login_redirect_url=/invite/${token}`
      };
    }

    const kindeUser = await getUser();
    if (!kindeUser?.id) {
      return {
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "Authentication failed. Please try signing in again."
      };
    }

    // Get user from database
    const user = await getUserByKindeID(kindeUser.id);
    if (!user) {
      return {
        success: false,
        error: "AUTHENTICATION_REQUIRED",
        message: "User account not found. Please contact support."
      };
    }

    // Check if user is already a member
    const isAlreadyMember = await checkIfMemberExists(user.id, link.boardId);
    if (isAlreadyMember) {
      return {
        success: false,
        error: "USER_ALREADY_MEMBER",
        message: "You are already a member of this board.",
        boardId: link.boardId,
        redirectUrl: `/board/${link.boardId}`
      };
    }

    // Link is valid and user can join
    return {
      success: true,
      boardId: link.boardId,
      message: `You will be added to "${link.boardTitle}" as a ${link.role === Role.member ? 'member' : 'guest'}.`
    };
  } catch (error) {
    console.error("Error validating magic link:", error);
    return {
      success: false,
      error: "INVALID_TOKEN",
      message: "An error occurred while validating the invitation link."
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
