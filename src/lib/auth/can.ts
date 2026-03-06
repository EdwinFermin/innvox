import type { Permission } from "@/lib/auth/permissions";
import { getRolePermissions } from "@/lib/auth/roles";

export function can(role: unknown, permission: Permission) {
  return getRolePermissions(role).includes(permission);
}
