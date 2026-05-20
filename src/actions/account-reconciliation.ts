"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AccountBalanceDiagnosis } from "@/types/account-reconciliation.types";

const idSchema = z.object({ bankAccountId: z.string().uuid() });

const ROUND = (value: number) => Math.round(value * 100) / 100;

const signedAmount = (type: string, amount: number): number => {
  if (type === "deposit" || type === "transfer_in") return amount;
  if (
    type === "withdrawal" ||
    type === "transfer_out" ||
    type === "lbtr_fee" ||
    type === "transfer_tax"
  ) {
    return -amount;
  }
  if (type === "adjustment") return amount;
  return 0;
};

interface RawTx {
  type: string;
  amount: number;
  date: string;
  balance_after: number;
}

async function loadAccountAndTransactions(bankAccountId: string) {
  const supabase = getSupabaseAdminClient();

  const { data: account, error: accountError } = await supabase
    .from("bank_accounts")
    .select("account_name, currency, current_balance")
    .eq("id", bankAccountId)
    .single();

  if (accountError || !account) {
    throw new Error("No se encontró la cuenta financiera.");
  }

  // Mirror the inverse of repair_bank_transaction_balances' ordering
  // (date DESC, created_at DESC, id DESC) so the forward chain walk matches the
  // balance_after values it writes — including same-timestamp batch inserts.
  const { data: txs, error: txError } = await supabase
    .from("bank_transactions")
    .select("type, amount, date, balance_after")
    .eq("bank_account_id", bankAccountId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (txError) {
    throw new Error(`Error al leer transacciones: ${txError.message}`);
  }

  return { supabase, account, txs: (txs ?? []) as RawTx[] };
}

function analyze(account: { current_balance: number }, txs: RawTx[]) {
  const sum = ROUND(
    txs.reduce((total, t) => total + signedAmount(t.type, Number(t.amount)), 0),
  );
  const currentBalance = ROUND(Number(account.current_balance));
  const first = txs[0];
  const opening = first
    ? ROUND(Number(first.balance_after) - signedAmount(first.type, Number(first.amount)))
    : currentBalance;
  const reconstructed = ROUND(opening + sum);

  // Walk the date-ordered chain and count rows whose stored balance_after
  // does not equal the running balance from the opening anchor.
  let running = opening;
  let chainBreaks = 0;
  for (const t of txs) {
    running = ROUND(running + signedAmount(t.type, Number(t.amount)));
    if (Math.abs(running - ROUND(Number(t.balance_after))) >= 0.01) {
      chainBreaks += 1;
    }
  }
  const last = txs[txs.length - 1];
  const lastMatches = last
    ? Math.abs(ROUND(Number(last.balance_after)) - currentBalance) < 0.01
    : true;

  return {
    sum,
    currentBalance,
    opening,
    reconstructed,
    phantomOffset: ROUND(currentBalance - reconstructed),
    chainBreaks,
    lastMatches,
  };
}

export async function diagnoseAccountBalance(input: {
  bankAccountId: string;
}): Promise<AccountBalanceDiagnosis> {
  await requirePermission(PERMISSIONS.settingsManage);
  const { bankAccountId } = idSchema.parse(input);
  const { account, txs } = await loadAccountAndTransactions(bankAccountId);
  const a = analyze(account, txs);

  return {
    account_name: account.account_name,
    currency: account.currency ?? "DOP",
    current_balance: a.currentBalance,
    transaction_count: txs.length,
    opening_balance: a.opening,
    movements_sum: a.sum,
    reconstructed_balance: a.reconstructed,
    phantom_offset: a.phantomOffset,
    chain_breaks: a.chainBreaks,
    last_balance_after_matches: a.lastMatches,
  };
}

/** Recompute current_balance = opening + Σ movements, then rebuild balance_after. */
export async function recomputeAccountBalance(input: {
  bankAccountId: string;
}): Promise<{ previous_balance: number; new_balance: number; correction: number }> {
  await requirePermission(PERMISSIONS.settingsManage);
  const { bankAccountId } = idSchema.parse(input);
  const { supabase, account, txs } = await loadAccountAndTransactions(bankAccountId);
  const a = analyze(account, txs);

  if (a.phantomOffset === 0) {
    return { previous_balance: a.currentBalance, new_balance: a.currentBalance, correction: 0 };
  }

  const { error: updateError } = await supabase
    .from("bank_accounts")
    .update({ current_balance: a.reconstructed })
    .eq("id", bankAccountId);

  if (updateError) {
    throw new Error(`Error al corregir el balance: ${updateError.message}`);
  }

  const { error: repairError } = await supabase.rpc("repair_bank_transaction_balances", {
    p_bank_account_id: bankAccountId,
  });

  if (repairError) {
    throw new Error(`Error al recalcular balances: ${repairError.message}`);
  }

  revalidatePath("/dashboard/bank-accounts");

  return {
    previous_balance: a.currentBalance,
    new_balance: a.reconstructed,
    correction: ROUND(a.reconstructed - a.currentBalance),
  };
}

/** Rebuild balance_after for every row in date order, anchored to current_balance. */
export async function repairRunningBalances(input: {
  bankAccountId: string;
}): Promise<{ ok: true }> {
  await requirePermission(PERMISSIONS.settingsManage);
  const { bankAccountId } = idSchema.parse(input);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.rpc("repair_bank_transaction_balances", {
    p_bank_account_id: bankAccountId,
  });

  if (error) {
    throw new Error(`Error al recalcular balances: ${error.message}`);
  }

  revalidatePath("/dashboard/bank-accounts");
  return { ok: true };
}
