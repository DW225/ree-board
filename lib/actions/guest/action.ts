"use server";

import {
  convertGuestToUser,
  createGuestUser,
  getUserBySupabaseId,
} from "@/lib/db/user";
import { createClient } from "@/lib/utils/supabase/server";
import { emailSchema } from "@/lib/utils/validation";
import { actionWithAuth } from "../actionWithAuth";
import { nanoid } from "nanoid";
import { z } from "zod";

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
  emailVerified?: boolean;
  error?: string;
}> {
  try {
    return await actionWithAuth(async (userId) => {
      // Validate email
      const validatedEmail = emailSchema.parse(email);

      const supabase = await createClient();

      // Get current anonymous user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: "No guest session found. Please start over.",
        };
      }

      const internalUser = await getUserBySupabaseId(user.id);
      if (!internalUser?.isGuest || internalUser.id !== userId) {
        return { success: false, error: "No guest account found." };
      }

      if (!user.is_anonymous) {
        if (
          user.is_anonymous === false &&
          user.email_confirmed_at &&
          user.email?.toLowerCase() === validatedEmail.toLowerCase()
        ) {
          return { success: true, needsOtp: true, emailVerified: true };
        }
        return {
          success: false,
          error: "Use the verified email for this account.",
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
    });
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
    return await actionWithAuth(async (userId) => {
      // Validate inputs
      const validatedEmail = emailSchema.parse(email);
      const validatedName = NameSchema.parse(name).trim();

      const supabase = await createClient();

      const {
        data: { user: originalUser },
        error: sessionError,
      } = await supabase.auth.getUser();
      if (sessionError || !originalUser) {
        return {
          success: false,
          error: "No guest session found. Please start over.",
        };
      }
      const internalUser = await getUserBySupabaseId(originalUser.id);
      if (!internalUser?.isGuest || internalUser.id !== userId) {
        return { success: false, error: "No guest account found." };
      }

      // A verified session can retry a failed profile save without consuming the code again.
      if (originalUser.is_anonymous) {
        const { error } = await supabase.auth.verifyOtp({
          email: validatedEmail,
          token: OTPSchema.parse(otp),
          type: "email_change",
        });
        if (error) return { success: false, error: error.message };
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (
        userError ||
        !user ||
        user.id !== originalUser.id ||
        user.is_anonymous !== false ||
        !user.email_confirmed_at ||
        user.email?.toLowerCase() !== validatedEmail.toLowerCase()
      ) {
        return {
          success: false,
          error: "Email verification is incomplete. Please try again.",
        };
      }

      const { error: profileError } = await supabase.auth.updateUser({
        data: {
          full_name: validatedName,
          display_name: validatedName,
          name: validatedName,
        },
      });
      if (profileError) return { success: false, error: profileError.message };

      await convertGuestToUser(originalUser.id, user.email, validatedName);

      return {
        success: true,
      };
    });
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
