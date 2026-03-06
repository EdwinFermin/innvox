import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export type Role = "ADMIN" | "USER";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    PERMISSIONS.usersManage,
    PERMISSIONS.branchesManage,
    PERMISSIONS.settingsManage,
    PERMISSIONS.dataDelete,
  ],
  USER: [],
};

export function normalizeRole(role: unknown): Role {
  return role === "ADMIN" ? "ADMIN" : "USER";
}

export function getRolePermissions(role: unknown): Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}
