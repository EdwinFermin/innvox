import { BankAccount } from "@/types/bank-account.types";

type BankAccountLike = Partial<BankAccount> & {
  branchId?: string;
  branchIds?: string[];
};

export function getBankAccountBranchIds(account: BankAccountLike): string[] {
  if (Array.isArray(account.branchIds) && account.branchIds.length > 0) {
    return account.branchIds.filter(Boolean);
  }

  if (account.branchId) {
    return [account.branchId];
  }

  return [];
}

export function normalizeBankAccount<T extends BankAccountLike>(account: T): T & { branchIds: string[] } {
  const iconUrl = typeof account.iconUrl === "string" ? account.iconUrl.trim() : "";

  return {
    ...account,
    branchIds: getBankAccountBranchIds(account),
    iconUrl: isSafeAccountImageSrc(iconUrl) ? iconUrl : undefined,
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

export function accountSupportsBranch(account: BankAccountLike, branchId?: string) {
  if (!branchId) return true;
  return getBankAccountBranchIds(account).includes(branchId);
}

export function getAccountBranchNames(account: BankAccountLike, branchNameById: Record<string, string>) {
  const names = getBankAccountBranchIds(account)
    .map((branchId) => branchNameById[branchId] ?? branchId)
    .filter(Boolean);

  return names.length > 0 ? names : ["Desconocida"];
}
