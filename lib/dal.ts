import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/utils/supabase/server'
import { getUserBySupabaseId } from '@/lib/db/user'
import type { VerifiedSession } from '@/lib/types/session'

/**
 * Data Access Layer - Centralized authentication verification
 *
 * ⚠️ SERVER-SIDE ONLY - Use only in Server Components, Server Actions, and Route Handlers
 *
 * This function verifies the user's session and returns user information.
 * It uses React's cache to memoize the result during a single render pass,
 * preventing duplicate authentication checks.
 *
 * For client-side components, use Server Actions to access authenticated data.
 *
 * @throws Redirects to sign-in if user is not authenticated
 * @returns VerifiedSession with user information
 */
export const verifySession = cache(async (): Promise<VerifiedSession> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Look up internal user by Supabase ID
  const internalUser = await getUserBySupabaseId(user.id)

  if (!internalUser) {
    // User authenticated but not in our database
    redirect('/sign-in')
  }

  return {
    isAuth: true,
    userId: internalUser.id,
    supabaseId: user.id,
    isGuest: internalUser.isGuest ?? false,
  }
})

/**
 * Get the current user's Supabase session
 *
 * ⚠️ SERVER-SIDE ONLY - Use only in Server Components, Server Actions, and Route Handlers
 *
 * This is a convenience function that returns the full Supabase user object.
 * Use this when you need additional user information beyond just the ID.
 *
 * @throws Redirects to sign-in if user is not authenticated
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return user
})
