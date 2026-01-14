"use server";

import { createClient } from "@/lib/utils/supabase/server";
import {
  createGuestUser,
  convertGuestToUser,
  getUserBySupabaseId,
} from "@/lib/db/user";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Validation Schemas
 */
const EmailSchema = z.email("Please enter a valid email address");

const OTPSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only numbers");

const NameSchema = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name must be less than 50 characters")
  .regex(
    /^[a-zA-Z0-9_\- ]+$/,
    "Name can only contain letters, numbers, spaces, underscores, and hyphens"
  )
  .refine((val) => val.trim().length > 0, {
    message: "Name cannot be only whitespace",
  });

/**
 * Creates an anonymous guest session and user record
 * Called when an unauthenticated user visits an invite link
 *
 * Checks if there's already an active anonymous session before creating a new one
 *
 * @param captchaToken - Optional Cloudflare Turnstile CAPTCHA token for verification
 * @returns Object with success status and optional userId or error message
 */
export async function createAnonymousGuestSession(captchaToken?: string) {
  try {
    const supabase = await createClient();

    // Check if there's already an active session
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();

    // If there's already an active anonymous session, return existing user
    if (existingUser?.is_anonymous) {
      const internalUser = await getUserBySupabaseId(existingUser.id);

      if (internalUser) {
        return {
          success: true,
          userId: internalUser.id,
          isGuest: true,
          existing: true, // Indicates this was an existing session
        };
      }
    }

    // If there's a non-anonymous user, they shouldn't be creating a guest session
    if (existingUser && !existingUser.is_anonymous) {
      return {
        success: false,
        error:
          "You're already signed in. Guest sessions are for unauthenticated users only.",
      };
    }

    // Sign in anonymously with Supabase (with optional CAPTCHA token)
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        captchaToken: captchaToken ?? undefined,
      },
    });

    if (error || !data.user) {
      console.error("Failed to create anonymous session:", error);
      return {
        success: false,
        error: error?.message || "Failed to create guest session",
      };
    }

    // Create guest user in our database
    // Guest expires after 30 days
    const guestExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    console.log("[Guest Session] Creating guest user in database");

    const guestUser = await createGuestUser({
      id: nanoid(),
      supabase_id: data.user.id,
      name: `Guest_${nanoid(6)}`,
      guestExpiresAt,
    });

    console.log("[Guest Session] Successfully created guest user");

    return {
      success: true,
      userId: guestUser.id,
      isGuest: true,
      existing: false, // New session created
    };
  } catch (error) {
    console.error("Error creating guest session:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create guest user",
    };
  }
}

/**
 * Initiates the guest account upgrade process
 * Sends an OTP to the provided email for verification
 *
 * @param email - Email address to upgrade the guest account with
 * @returns Object with success status and whether OTP is needed
 */
export async function upgradeGuestAccount(email: string): Promise<{
  success: boolean;
  needsOtp?: boolean;
  error?: string;
}> {
  try {
    // Validate email
    const validatedEmail = EmailSchema.parse(email);

    const supabase = await createClient();

    // Get current anonymous user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.is_anonymous) {
      return {
        success: false,
        error: "No guest session found. Please start over.",
      };
    }

    // Update user to have email (this triggers OTP send)
    const { error: updateError } = await supabase.auth.updateUser({
      email: validatedEmail,
    });

    if (updateError) {
      console.error("Failed to update user email:", updateError);
      return {
        success: false,
        error: updateError.message,
        needsOtp: false,
      };
    }

    // OTP sent successfully - user needs to verify
    return {
      success: true,
      needsOtp: true,
    };
  } catch (error) {
    console.error("Error upgrading guest account:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start upgrade process",
    };
  }
}

/**
 * Verifies the OTP and completes the guest account upgrade
 * Converts the anonymous user to a permanent user with email
 *
 * @param email - Email address (must match the one used in upgradeGuestAccount)
 * @param otp - 6-digit OTP code sent to the email
 * @param name - Display name for the upgraded account
 * @returns Object with success status and optional error message
 */
export async function verifyGuestUpgradeOTP(
  email: string,
  otp: string,
  name: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate inputs
    const validatedEmail = EmailSchema.parse(email);
    const validatedOtp = OTPSchema.parse(otp);
    const validatedName = NameSchema.parse(name);

    const supabase = await createClient();

    // Verify OTP
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: validatedEmail,
      token: validatedOtp,
      type: "email",
    });

    if (verifyError) {
      console.error("Failed to verify OTP:", verifyError);
      return {
        success: false,
        error: verifyError.message,
      };
    }

    // Get user after verification
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Failed to get user after verification",
      };
    }

    // Update our database - convert guest to permanent user
    await convertGuestToUser(user.id, validatedEmail);

    // Update user name in database

    await db
      .update(userTable)
      .set({ name: validatedName })
      .where(eq(userTable.supabase_id, user.id));

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error verifying guest upgrade OTP:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify OTP",
    };
  }
}
