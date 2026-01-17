'use client';

import { createClient } from '@/lib/utils/supabase/client';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

/**
 * Custom hook for accessing Supabase session in client components
 *
 * Provides a standardized way to access the current user session,
 * and automatically listens for auth state changes.
 *
 * @returns Session data and helper properties
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, accessToken, isLoading, isAuthenticated } = useSupabaseSession();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!isAuthenticated) return <SignInPrompt />;
 *
 *   return <div>Hello {user.email}</div>;
 * }
 * ```
 */
export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return {
    /** The full Supabase session object */
    session,
    /** The authenticated user, or null if not authenticated */
    user: session?.user ?? null,
    /** The access token for making authenticated API calls */
    accessToken: session?.access_token,
    /** Whether the session is still loading */
    isLoading,
    /** Whether the user is authenticated */
    isAuthenticated: !!session,
  };
}
