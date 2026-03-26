import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export type Role = "ADMIN" | "USER" | "ACCOUNTANT";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    PERMISSIONS.usersManage,
    PERMISSIONS.branchesManage,
    PERMISSIONS.settingsManage,
    PERMISSIONS.dataDelete,
    PERMISSIONS.clientsCreate,
    PERMISSIONS.loyaltyAccess,
  ],
  USER: [
    PERMISSIONS.clientsCreate,
    PERMISSIONS.loyaltyAccess,
  ],
  ACCOUNTANT: [
    PERMISSIONS.dataDelete,
  ],
};

export function normalizeRole(role: unknown): Role {
  if (role === "ADMIN") return "ADMIN";
  if (role === "ACCOUNTANT") return "ACCOUNTANT";
  return "USER";
}

export function getRolePermissions(role: unknown): Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}
