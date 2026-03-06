export const PERMISSIONS = {
  usersManage: "users.manage",
  branchesManage: "branches.manage",
  settingsManage: "settings.manage",
  dataDelete: "data.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
