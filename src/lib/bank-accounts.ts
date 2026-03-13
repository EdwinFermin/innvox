import { BankAccount } from "@/types/bank-account.types";

export function getBankAccountBranchIds(account: Partial<BankAccount>): string[] {
  return account.branch_ids ?? [];
}

export function normalizeBankAccount<T extends Partial<BankAccount>>(
  account: T,
): T & { branch_ids: string[] } {
  const iconUrl =
    typeof account.icon_url === "string" ? account.icon_url.trim() : "";

  return {
    ...account,
    branch_ids: getBankAccountBranchIds(account),
    icon_url: isSafeAccountImageSrc(iconUrl) ? iconUrl : undefined,
  };
}

export function isSafeAccountImageSrc(src?: string | null) {
  if (!src) return false;

  return (
    src.startsWith("data:image/") ||
    src.startsWith("blob:") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  );
}

export function accountSupportsBranch(
  account: Partial<BankAccount>,
  branchId?: string,
) {
  if (!branchId) return true;
  return getBankAccountBranchIds(account).includes(branchId);
}

export function getAccountBranchNames(
  account: Partial<BankAccount>,
  branchNameById: Record<string, string>,
) {
  const names = getBankAccountBranchIds(account)
    .map((branchId) => branchNameById[branchId] ?? branchId)
    .filter(Boolean);

  return names.length > 0 ? names : ["Desconocida"];
}
