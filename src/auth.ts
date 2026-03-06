import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import type { User as AppUser } from "@/types/auth.types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FirestoreDoc = {
  fields?: Record<string, unknown>;
};

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "development"
    ? "dev-insecure-secret-change-me"
    : undefined);

function getStringField(value: unknown, fallback = "") {
  if (!value || typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  if (typeof record.stringValue === "string") return record.stringValue;
  return fallback;
}

function getStringArrayField(value: unknown) {
  if (!value || typeof value !== "object") return [] as string[];
  const record = value as Record<string, unknown>;
  const arrayValue = record.arrayValue;
  if (!arrayValue || typeof arrayValue !== "object") return [] as string[];
  const values = (arrayValue as { values?: unknown[] }).values;
  if (!Array.isArray(values)) return [] as string[];
  return values
    .map((item) => getStringField(item))
    .filter((item) => item.length > 0);
}

function toAppUser(uid: string, email: string, doc: FirestoreDoc | null): AppUser {
  const fields = doc?.fields ?? {};
  const type = getStringField(fields.type, "USER");

  return {
    id: uid,
    email,
    name: getStringField(fields.name, email.split("@")[0] ?? "Usuario"),
    avatar: getStringField(fields.avatar, ""),
    createdAt: new Date().toISOString(),
    type: type === "ADMIN" ? "ADMIN" : "USER",
    branchIds: getStringArrayField(fields.branchIds),
  };
}

async function loginWithFirebase(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    localId: string;
    idToken: string;
    email: string;
  };
}

async function getFirebaseProfile(uid: string, idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }

  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as FirestoreDoc;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const authPayload = await loginWithFirebase(parsed.data.email, parsed.data.password);
        if (!authPayload) {
          return null;
        }

        const profileDoc = await getFirebaseProfile(authPayload.localId, authPayload.idToken);
        const profile = toAppUser(authPayload.localId, authPayload.email, profileDoc);

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          image: profile.avatar,
          role: profile.type,
          branchIds: profile.branchIds ?? [],
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "ADMIN" | "USER" }).role ?? "USER";
        token.branchIds = (user as { branchIds?: string[] }).branchIds ?? [];
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as "ADMIN" | "USER") ?? "USER";
        session.user.branchIds = (token.branchIds as string[]) ?? [];
      }

      return session;
    },
  },
});
