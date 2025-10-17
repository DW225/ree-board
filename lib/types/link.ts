import { Role } from "@/lib/constants/role";
import type { Board } from "./board";
import type { User } from "./user";

/**
 * Base Link interface matching the database schema exactly
 */
export interface Link {
  id: number;
  boardId: Board["id"];
  token: string;
  role: Role;
  createdAt: Date;
  creator: User["id"] | null;
  expiresAt: Date | null;
}

/**
 * Request type for creating a new magic link
 */
export interface CreateLinkRequest {
  role: Role.member | Role.guest; // No owner role assignment via magic links
  expirationHours?: number; // null/undefined = never expires
}

/**
 * Link with additional creator information and computed fields for UI
 */
export interface LinkWithCreator extends Link {
  creatorName?: string;
  isExpired: boolean;
  expiresIn: string; // Human readable: "2 hours", "1 day", "expired", "never"
  linkUrl?: string; // Full URL for sharing
}

/**
 * Response type from API when fetching links
 */
export interface GetLinksResponse {
  links: LinkWithCreator[];
}

/**
 * Response type from API when creating a link
 */
export interface CreateLinkResponse {
  link: Link;
  success: boolean;
}

/**
 * Response type from API when revoking a link
 */
export interface RevokeLinkResponse {
  success: boolean;
}

/**
 * Request type for revoking a magic link
 */
export interface RevokeLinkRequest {
  linkId: number;
}

/**
 * Form data type for the magic link creation form
 */
export interface MagicLinkFormData {
  role: Role;
  expirationHours: number | null;
}

/**
 * Expiration option for the UI dropdown
 */
export interface ExpirationOption {
  label: string;
  value: number | null; // null means never expires
  hours?: number;
}

/**
 * Constants for expiration options
 */
export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { label: "1 Hour", value: 1, hours: 1 },
  { label: "1 Day", value: 24, hours: 24 },
  { label: "1 Week", value: 168, hours: 168 },
  { label: "1 Month", value: 720, hours: 720 },
  { label: "Never", value: null },
];

/**
 * Magic link usage error types
 */
export type MagicLinkError =
  | "LINK_NOT_FOUND"
  | "LINK_EXPIRED"
  | "USER_ALREADY_MEMBER"
  | "BOARD_NOT_FOUND"
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_TOKEN";

/**
 * Result of attempting to use a magic link
 */
export interface MagicLinkUsageResult {
  success: boolean;
  error?: MagicLinkError;
  message?: string;
  boardId?: string;
  redirectUrl?: string;
}

/**
 * Utility type for magic link status
 */
export type LinkStatus = "active" | "expired" | "expires_soon";

/**
 * Helper function types
 */
export type GetTimeUntilExpiration = (expiresAt: Date) => string;
export type FormatLinkUrl = (token: string, baseUrl?: string) => string;
export type ValidateCreateLinkRequest = (data: CreateLinkRequest) => boolean;

/**
 * Type guard to check if a role is allowed for magic links
 */
export function isValidMagicLinkRole(role: Role): role is Role.member | Role.guest {
  return role === Role.member || role === Role.guest;
}

/**
 * Type for magic link creation errors
 */
export interface CreateLinkError {
  field?: keyof CreateLinkRequest;
  message: string;
  code: string;
}
