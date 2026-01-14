"use client";
import type { ReactNode } from "react";

/**
 * AuthProvider component
 *
 * Note: This was previously a KindeProvider wrapper, but we've migrated to Supabase Auth.
 * Supabase Auth doesn't require a provider wrapper since it uses server-side cookies.
 *
 * We keep this component for backward compatibility and potential future auth provider needs.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
