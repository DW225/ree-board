import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import invariant from "tiny-invariant";

/**
 * Creates a Supabase admin client with service role privileges.
 * This client should only be used in server-side contexts (API routes, server actions, scripts).
 *
 * IMPORTANT: Never expose the service role key to the client-side!
 *
 * Use cases:
 * - Creating users via Admin API during migration
 * - Performing administrative operations that bypass RLS
 * - Managing user accounts programmatically
 *
 * @returns A configured Supabase admin client with service role privileges
 * @throws {Error} If required environment variables are missing
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  invariant(
    url && secretKey,
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment variables"
  );

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
