import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import invariant from "tiny-invariant";

/**
 * Creates a Supabase client for browser-side usage.
 *
 * @returns A configured Supabase browser client
 * @throws {Error} If required environment variables are not set
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  invariant(
    url && key,
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment variables"
  );

  return createBrowserClient(url, key);
}
