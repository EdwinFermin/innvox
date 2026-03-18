import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { getAppBaseUrl } from "./link-payments";

export type PublicBankAccount = {
  id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string | null;
  currency: string;
  icon_url: string | null;
  account_type: string;
};

export function buildPublicAccountsLink(branchId: string, origin?: string) {
  const baseUrl = getAppBaseUrl(origin);
  return `${baseUrl}/accounts/${encodeURIComponent(branchId)}`;
}

export function buildAccountsQrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

export async function fetchPublicBranchAccounts(
  branchId: string,
): Promise<PublicBankAccount[]> {
  const supabase = getSupabaseBrowserClient();

  const { data: junctionRows, error: junctionError } = await supabase
    .from("bank_account_branches")
    .select("bank_account_id")
    .eq("branch_id", branchId);

  if (junctionError) throw junctionError;

  const accountIds = (junctionRows ?? []).map((row) => row.bank_account_id);

  if (accountIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, account_name, bank_name, account_number, currency, icon_url, account_type")
    .in("id", accountIds)
    .eq("is_active", true)
    .eq("account_type", "bank")
    .eq("is_public", true);

  if (error) throw error;

  return (data ?? []) as PublicBankAccount[];
}
