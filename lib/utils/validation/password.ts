import { z } from "zod";

/**
 * Shared password validation schema
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special symbol
 */
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>\-_~/\\';=+[\]])/,
    "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one symbol"
  );