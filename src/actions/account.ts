"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/guards";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contrasena actual es obligatoria"),
    newPassword: z.string().min(6, "La nueva contrasena debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contrasena"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La confirmacion no coincide con la nueva contrasena",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contrasena debe ser diferente a la actual",
    path: ["newPassword"],
  });

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export async function changeOwnPassword(input: ChangePasswordInput) {
  const session = await requireAuth();
  const email = session.user.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("No se pudo validar tu cuenta porque la sesion no tiene correo.");
  }

  const values = changePasswordSchema.parse(input);

  const verificationClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { error: signInError } = await verificationClient.auth.signInWithPassword({
    email,
    password: values.currentPassword,
  });

  if (signInError) {
    throw new Error("La contrasena actual no es correcta.");
  }

  const adminClient = getSupabaseAdminClient();
  const { data: userRow, error: userError } = await adminClient
    .from("users")
    .select("id")
    .ilike("email", email)
    .single();

  if (userError || !userRow?.id) {
    throw new Error("No se pudo resolver tu usuario en la base de datos.");
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    userRow.id,
    {
      password: values.newPassword,
    },
  );

  if (updateError) {
    throw new Error(`No se pudo actualizar la contrasena: ${updateError.message}`);
  }

  await verificationClient.auth.signOut();
}

export async function sendPasswordResetEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("El correo es obligatorio.");
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${getBaseUrl()}/reset-password`,
  });

  if (error) {
    // Don't reveal whether the email exists
    console.error("Password reset error:", error.message);
  }
}

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "La nueva contrasena debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contrasena"),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La confirmacion no coincide con la nueva contrasena",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export async function resetPassword(input: ResetPasswordInput) {
  const values = resetPasswordSchema.parse(input);

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: values.accessToken,
    refresh_token: values.refreshToken,
  });

  if (sessionError) {
    throw new Error("El enlace de recuperacion es invalido o ha expirado.");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: values.newPassword,
  });

  if (updateError) {
    throw new Error(`No se pudo actualizar la contrasena: ${updateError.message}`);
  }
}
