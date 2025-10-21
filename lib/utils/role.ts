import { Role, roleDisplayName } from "@/lib/constants/role";

/**
 * Get the display name for a given role.
 * @param role - The role enum value.
 * @returns The display name of the role.
 */
export const getRoleDisplayName = (role: Role): string => {
  return roleDisplayName[role];
};

/**
 * Available role options for magic link creation.
 * Excludes owner role as magic links should not grant owner privileges.
 */
export const magicLinkRoleOptions = [Role.member, Role.guest];
