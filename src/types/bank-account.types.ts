import { Timestamp } from "firebase/firestore";

export type AccountType = "bank" | "petty_cash";

export type Currency = "DOP" | "USD";

export interface BankAccount {
  id: string;
  branchId: string;
  accountType: AccountType;
  bankName?: string; // Only for bank accounts
  accountNumber?: string; // Only for bank accounts
  accountName: string; // e.g., "Caja Chica", "Cuenta Operativa"
  currentBalance: number;
  currency: Currency;
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

export type PaymentMethod = "cash" | "bank";
