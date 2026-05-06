export const userRoles = ["ADMIN", "USER"] as const;

export type UserRole = (typeof userRoles)[number];

export function isUserRole(value: unknown): value is UserRole {
  return userRoles.includes(value as UserRole);
}
