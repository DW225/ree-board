import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
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
 * @throws Redirects to login if user is not authenticated
 * @returns VerifiedSession with user information
 */
export const verifySession = cache(async (): Promise<VerifiedSession> => {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user?.id) {
    redirect('/api/auth/login')
  }

  return {
    isAuth: true,
    userId: user.id,
    kindeId: user.id,
  }
})

/**
 * Get the current user's Kinde session
 *
 * ⚠️ SERVER-SIDE ONLY - Use only in Server Components, Server Actions, and Route Handlers
 *
 * This is a convenience function that returns the full Kinde user object.
 * Use this when you need additional user information beyond just the ID.
 *
 * @throws Redirects to login if user is not authenticated
 */
export const getCurrentUser = cache(async () => {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user?.id) {
    redirect('/api/auth/login')
  }

  return user
})
