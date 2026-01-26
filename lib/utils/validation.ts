import { z } from "zod";

/**
 * Shared validation schemas for the application
 */

// Board validation
export const boardTitleSchema = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(100, "Title must be less than 100 characters")
  .trim();

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
