export enum Role {
  owner,
  member,
  guest,
}

export const roleHierarchy: Record<Role, number> = {
  [Role.owner]: 0, // Highest privilege
  [Role.member]: 1,
  [Role.guest]: 2, // Lowest privilege
};

export function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] <= roleHierarchy[requiredRole];
}

export const roleDisplayName: Record<Role, string> = {
  [Role.owner]: "Owner",
  [Role.member]: "Member",
  [Role.guest]: "Guest",
};

export const roleOptions: Record<Role, { label: string; description: string }> =
  {
    [Role.owner]: {
      label: "Owner",
      description: "Full access to manage the board",
    },
    [Role.member]: {
      label: "Member",
      description: "Can create and edit posts",
    },
    [Role.guest]: {
      label: "Guest",
      description: "Read-only access",
    },
  };
