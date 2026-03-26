"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  type: "ADMIN" | "USER" | "ACCOUNTANT";
  branch_ids?: string[];
}

export async function createUser(data: CreateUserData) {
  const { email, password, name, type, branch_ids: branchIds = [] } = data;
  await requirePermission(PERMISSIONS.usersManage);

  const supabase = getSupabaseAdminClient();

  // Create the auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    throw new Error(`Error al crear el usuario: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Insert the profile row
  const { error: profileError } = await supabase.from("users").insert({
    id: userId,
    name,
    email,
    type,
  });

  if (profileError) {
    // Roll back the auth user if the profile insert fails
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(
      `Error al crear el perfil del usuario: ${profileError.message}`,
    );
  }

  // Insert branch associations
  if (branchIds.length > 0) {
    const rows = branchIds.map((branchId) => ({
      user_id: userId,
      branch_id: branchId,
    }));

    const { error: branchError } = await supabase
      .from("user_branches")
      .insert(rows);

    if (branchError) {
      throw new Error(
        `Error al asignar sucursales al usuario: ${branchError.message}`,
      );
    }
  }

  revalidatePath("/dashboard/users");
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    type?: "ADMIN" | "USER" | "ACCOUNTANT";
    branch_ids?: string[];
  },
) {
  await requirePermission(PERMISSIONS.usersManage);

  const supabase = getSupabaseAdminClient();

  // Update profile fields
  const { name, email, type } = data;
  const updatePayload: Database["public"]["Tables"]["users"]["Update"] = {};
  if (name !== undefined) updatePayload.name = name;
  if (email !== undefined) updatePayload.email = email;
  if (type !== undefined) updatePayload.type = type;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      throw new Error(
        `Error al actualizar el usuario: ${error.message}`,
      );
    }
  }

  // Update email in auth if changed
  if (email !== undefined) {
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      email,
    });

    if (authError) {
      throw new Error(
        `Error al actualizar el email de autenticación: ${authError.message}`,
      );
    }
  }

  // Replace branch associations if provided
  if (data.branch_ids !== undefined) {
    // Delete existing associations
    const { error: deleteError } = await supabase
      .from("user_branches")
      .delete()
      .eq("user_id", id);

    if (deleteError) {
      throw new Error(
        `Error al actualizar sucursales del usuario: ${deleteError.message}`,
      );
    }

    // Insert new associations
    if (data.branch_ids.length > 0) {
      const rows = data.branch_ids.map((branchId) => ({
        user_id: id,
        branch_id: branchId,
      }));

      const { error: insertError } = await supabase
        .from("user_branches")
        .insert(rows);

      if (insertError) {
        throw new Error(
          `Error al asignar sucursales al usuario: ${insertError.message}`,
        );
      }
    }
  }

  revalidatePath("/dashboard/users");
}

export async function deleteUser(id: string) {
  await requirePermission(PERMISSIONS.usersManage);

  const supabase = getSupabaseAdminClient();

  // Delete branch associations first
  const { error: branchError } = await supabase
    .from("user_branches")
    .delete()
    .eq("user_id", id);

  if (branchError) {
    throw new Error(
      `Error al eliminar sucursales del usuario: ${branchError.message}`,
    );
  }

  // Delete the profile row
  const { error: profileError } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (profileError) {
    throw new Error(
      `Error al eliminar el perfil del usuario: ${profileError.message}`,
    );
  }

  // Delete the auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(id);

  if (authError) {
    throw new Error(
      `Error al eliminar el usuario de autenticación: ${authError.message}`,
    );
  }

  revalidatePath("/dashboard/users");
}
