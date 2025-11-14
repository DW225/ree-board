/**
 * Payload structure for session data.
 * Contains user identification and optional expiration information.
 */
export interface SessionPayload {
  userId: string;
  kindeId: string;
  expiresAt?: Date;
}

/**
 * Verified session object returned after successful authentication.
 * The isAuth property is always true, serving as a type discriminator.
 */
export interface VerifiedSession {
  isAuth: true;
  userId: string;
  kindeId: string;
}
