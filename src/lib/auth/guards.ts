import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { can } from "@/lib/auth/can";
import type { Permission } from "@/lib/auth/permissions";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();

  if (!can(session.user.role, permission)) {
    redirect("/dashboard");
  }

  return session;
}
