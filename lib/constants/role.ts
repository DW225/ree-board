export enum Role {
  owner,
  member,
  guest,
}

export const roleHierarchy: Record<Role, number> = {
  [Role.owner]: 0,  // Highest privilege
  [Role.member]: 1,
  [Role.guest]: 2,  // Lowest privilege
};

export function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] <= roleHierarchy[requiredRole];
}
