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
        role?: "ADMIN" | "USER";
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
    createdAt: "",
    type: sessionUser.role === "ADMIN" ? "ADMIN" : "USER",
    branchIds: sessionUser.branchIds ?? [],
  };
}

export function useAuthStore(): AuthState;
export function useAuthStore<T>(selector: (state: AuthState) => T): T;
export function useAuthStore<T>(selector?: (state: AuthState) => T) {
  const { data, status } = useSession();
  const sessionUser = data?.user;

  const user = useMemo(
    () =>
      toUser(
        sessionUser
          ? {
              id: sessionUser.id,
              name: sessionUser.name,
              email: sessionUser.email,
              image: sessionUser.image,
              role: sessionUser.role,
              branchIds: sessionUser.branchIds,
            }
          : undefined,
      ),
    [sessionUser],
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
