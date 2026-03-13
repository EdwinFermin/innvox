import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "development"
    ? "dev-insecure-secret-change-me"
    : undefined);

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

        const supabase = getSupabaseAdminClient();

        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });

        if (authError || !authData.user) {
          return null;
        }

        const uid = authData.user.id;
        const email = authData.user.email ?? parsed.data.email;

        const { data: profile } = await supabase
          .from("users")
          .select("name, avatar, type, created_at")
          .eq("id", uid)
          .single();

        const { data: branchRows } = await supabase
          .from("user_branches")
          .select("branch_id")
          .eq("user_id", uid);

        const branchIds = branchRows?.map((r) => r.branch_id) ?? [];

        return {
          id: uid,
          email,
          name: profile?.name ?? email.split("@")[0] ?? "Usuario",
          image: profile?.avatar ?? "",
          role: profile?.type === "ADMIN" ? "ADMIN" : "USER",
          branchIds,
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
