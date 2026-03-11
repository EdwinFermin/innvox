import { isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { BankAccount } from "@/types/bank-account.types";

function getAccountBankLabel(account: BankAccount) {
  return account.accountType === "bank"
    ? account.bankName || "Cuenta bancaria"
    : "Caja";
}

function getAccountLast4Digits(account: BankAccount) {
  const digits = account.accountNumber?.slice(-4) || "";
  return digits ? `****${digits}` : "";
}

export function BankAccountOptionContent({
  account,
}: {
  account: BankAccount;
}) {
  const last4Digits = getAccountLast4Digits(account);

  return (
    <span className="flex items-center gap-3">
      {isSafeAccountImageSrc(account.iconUrl) ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={account.iconUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
          {account.accountType === "bank" ? "BK" : "CJ"}
        </span>
      )}
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="truncate font-medium">{account.accountName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {getAccountBankLabel(account)}
          {last4Digits ? ` · ${last4Digits}` : ""}
        </span>
      </span>
    </span>
  );
}
