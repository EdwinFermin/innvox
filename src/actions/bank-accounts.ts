"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/guards";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

interface CreateBankAccountData {
  accountType: "bank" | "petty_cash";
  bankName?: string | null;
  accountNumber?: string | null;
  accountName: string;
  iconUrl?: string | null;
  currentBalance?: number;
  currency?: "DOP" | "USD";
  isActive?: boolean;
  isPublic?: boolean | null;
  branchIds: string[];
}

interface UpdateBankAccountData {
  accountType?: "bank" | "petty_cash";
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string;
  iconUrl?: string | null;
  currency?: "DOP" | "USD";
  isActive?: boolean;
  isPublic?: boolean | null;
  branchIds?: string[];
}

interface TransferFundsData {
  sourceAccountId: string;
  destAccountId: string;
  amount: number;
  description?: string | null;
}

interface AdjustBalanceData {
  bankAccountId: string;
  amount: number;
  description?: string | null;
}

export async function createBankAccount(data: CreateBankAccountData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { data: inserted, error } = await supabase
    .from("bank_accounts")
    .insert({
      account_type: data.accountType,
      bank_name: data.bankName ?? null,
      account_number: data.accountNumber ?? null,
      account_name: data.accountName,
      icon_url: data.iconUrl ?? null,
      current_balance: data.currentBalance ?? 0,
      currency: data.currency ?? "DOP",
      is_active: data.isActive ?? true,
      is_public: data.isPublic ?? null,
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(`Error al crear la cuenta bancaria: ${error?.message}`);
  }

  // Link the account to the specified branches
  if (data.branchIds.length > 0) {
    const rows = data.branchIds.map((branchId) => ({
      bank_account_id: inserted.id,
      branch_id: branchId,
    }));

    const { error: linkError } = await supabase
      .from("bank_account_branches")
      .insert(rows);

    if (linkError) {
      throw new Error(
        `Error al asignar sucursales a la cuenta: ${linkError.message}`,
      );
    }
  }

  revalidatePath("/dashboard/cuentas");
}

export async function updateBankAccount(
  id: string,
  data: UpdateBankAccountData,
) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  const updatePayload: Database["public"]["Tables"]["bank_accounts"]["Update"] = {};
  if (data.accountType !== undefined) updatePayload.account_type = data.accountType;
  if (data.bankName !== undefined) updatePayload.bank_name = data.bankName;
  if (data.accountNumber !== undefined) updatePayload.account_number = data.accountNumber;
  if (data.accountName !== undefined) updatePayload.account_name = data.accountName;
  if (data.iconUrl !== undefined) updatePayload.icon_url = data.iconUrl;
  if (data.currency !== undefined) updatePayload.currency = data.currency;
  if (data.isActive !== undefined) updatePayload.is_active = data.isActive;
  if (data.isPublic !== undefined) updatePayload.is_public = data.isPublic;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from("bank_accounts")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      throw new Error(
        `Error al actualizar la cuenta bancaria: ${error.message}`,
      );
    }
  }

  // Replace branch associations if provided
  if (data.branchIds !== undefined) {
    const { error: deleteError } = await supabase
      .from("bank_account_branches")
      .delete()
      .eq("bank_account_id", id);

    if (deleteError) {
      throw new Error(
        `Error al actualizar sucursales de la cuenta: ${deleteError.message}`,
      );
    }

    if (data.branchIds.length > 0) {
      const rows = data.branchIds.map((branchId) => ({
        bank_account_id: id,
        branch_id: branchId,
      }));

      const { error: insertError } = await supabase
        .from("bank_account_branches")
        .insert(rows);

      if (insertError) {
        throw new Error(
          `Error al asignar sucursales a la cuenta: ${insertError.message}`,
        );
      }
    }
  }

  revalidatePath("/dashboard/cuentas");
}

export async function deleteBankAccount(id: string) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  // Delete branch associations first
  const { error: linkError } = await supabase
    .from("bank_account_branches")
    .delete()
    .eq("bank_account_id", id);

  if (linkError) {
    throw new Error(
      `Error al eliminar asociaciones de la cuenta: ${linkError.message}`,
    );
  }

  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar la cuenta bancaria: ${error.message}`);
  }

  revalidatePath("/dashboard/cuentas");
}

export async function toggleBankAccountActive(id: string, isActive: boolean) {
  await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("bank_accounts")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Error al cambiar el estado de la cuenta: ${error.message}`,
    );
  }

  revalidatePath("/dashboard/cuentas");
}

export async function transferFunds(data: TransferFundsData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("transfer_funds", {
    p_source_account_id: data.sourceAccountId,
    p_dest_account_id: data.destAccountId,
    p_amount: data.amount,
    p_description: data.description ?? null,
    p_created_by: session.user.id,
  });

  if (error) {
    throw new Error(`Error al transferir fondos: ${error.message}`);
  }

  revalidatePath("/dashboard/cuentas");
}

export async function adjustBalance(data: AdjustBalanceData) {
  const session = await requireAuth();

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("adjust_balance", {
    p_bank_account_id: data.bankAccountId,
    p_amount: data.amount,
    p_description: data.description ?? null,
    p_created_by: session.user.id,
  });

  if (error) {
    throw new Error(`Error al ajustar el balance: ${error.message}`);
  }

  revalidatePath("/dashboard/cuentas");
}
