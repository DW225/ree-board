import {
  BOARD_DESCRIPTION_MAX_LENGTH,
  BOARD_VISIBILITIES,
} from "@/lib/constants/board";
import { z } from "zod";

/**
 * Shared validation schemas for the application
 */

// Board ID validation (NanoID format: 21 chars, alphanumeric + _ and -)
export const boardIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{21}$/, "Invalid board ID format");

// Board validation
export const boardTitleSchema = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(100, "Title must be less than 100 characters")
  .trim();

export const boardVisibilitySchema = z.enum(BOARD_VISIBILITIES);

export const boardDetailsSchema = z
  .object({
    title: z.string().trim().pipe(boardTitleSchema),
    description: z
      .string()
      .max(
        BOARD_DESCRIPTION_MAX_LENGTH,
        `Description must be at most ${BOARD_DESCRIPTION_MAX_LENGTH} characters`
      )
      .trim()
      .nullable()
      .transform((value) => value || null),
    visibility: boardVisibilitySchema,
  })
  .partial()
  .refine(
    (details) => Object.values(details).some((value) => value !== undefined),
    {
      message: "At least one board setting is required",
    }
  );

// Email validation
export const emailSchema = z
  .string("Please enter a valid email address")
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address"));

// Multiple emails validation
export const emailListSchema = z.array(emailSchema);

// Validation helper functions
export function validateBoardTitle(title: string) {
  return boardTitleSchema.safeParse(title);
}

export function validateEmail(email: string) {
  return emailSchema.safeParse(email);
}

export function validateEmailList(emails: string[]) {
  return emailListSchema.safeParse(emails);
}
