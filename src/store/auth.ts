"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  loading: boolean;
}

function toUser(
  sessionUser:
    | {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: "ADMIN" | "USER" | "ACCOUNTANT";
        branchIds?: string[];
      }
    | undefined,
): User | null {
  if (!sessionUser) {
    return null;
  }

  if (!sessionUser.id || !sessionUser.email) {
    return null;
  }

  return {
    id: sessionUser.id,
    name: sessionUser.name ?? "Usuario",
    email: sessionUser.email,
    avatar: sessionUser.image ?? "",
    created_at: "",
    type: sessionUser.role === "ADMIN" ? "ADMIN" : sessionUser.role === "ACCOUNTANT" ? "ACCOUNTANT" : "USER",
    branch_ids: sessionUser.branchIds ?? [],
  };
}

export function useAuthStore(): AuthState;
export function useAuthStore<T>(selector: (state: AuthState) => T): T;
export function useAuthStore<T>(selector?: (state: AuthState) => T) {
  const { data, status } = useSession();
  const sessionUser = data?.user;

  // Depend on primitive values so a new sessionUser object reference
  // from useSession() doesn't break memoisation and trigger render loops.
  const id = sessionUser?.id;
  const name = sessionUser?.name;
  const email = sessionUser?.email;
  const image = sessionUser?.image;
  const role = sessionUser?.role;
  const branchKey = sessionUser?.branchIds?.join(",");

  const user = useMemo(
    () =>
      toUser(
        id
          ? {
              id,
              name,
              email,
              image,
              role,
              branchIds: branchKey ? branchKey.split(",") : [],
            }
          : undefined,
      ),
    [id, name, email, image, role, branchKey],
  );

  const state = useMemo<AuthState>(
    () => ({
      user,
      loading: status === "loading",
    }),
    [status, user],
  );

  return selector ? selector(state) : state;
}
