/**
 * Payload structure for session data.
 * Contains user identification and optional expiration information.
 */
export interface SessionPayload {
  userId: string;
  supabaseId: string;
  expiresAt?: Date;
}

/**
 * Verified session object returned after successful authentication.
 * The isAuth property is always true, serving as a type discriminator.
 */
export interface VerifiedSession {
  isAuth: true;
  userId: string; // Internal user ID (Nano ID)
  supabaseId: string; // Supabase auth user ID
  isGuest: boolean; // Whether user is a guest
}
