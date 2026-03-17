import * as React from "react";

import type { BankAccount, Currency, PaymentMethod } from "@/types/bank-account.types";
import type { Expense } from "@/types/expense.types";
import type { Income } from "@/types/income.types";
import { extractDateOnlyKey, parseDate, parseDateOnly } from "@/utils/dates";

export type DailyCloseIncomeMethod = Extract<PaymentMethod, "cash" | "bank">;

export type DailyCloseSummary = {
  cashIncome: number;
  transferIncome: number;
  expenses: number;
  net: number;
};

export type DailyCloseIncomeRow = {
  id: string;
  kind: "income";
  method: DailyCloseIncomeMethod;
  amount: number;
  description: string;
  date: Date;
  branchId: string;
  bankAccountName: string | null;
};

export type DailyCloseExpenseRow = {
  id: string;
  kind: "expense";
  amount: number;
  description: string;
  date: Date;
  branchId: string;
  paymentMethod: PaymentMethod;
  bankAccountName: string | null;
};

export type DailyCloseMovementRow = DailyCloseIncomeRow | DailyCloseExpenseRow;

function getDateKey(value: string | Date | null | undefined) {
  return extractDateOnlyKey(value);
}

function sortRows(a: DailyCloseMovementRow, b: DailyCloseMovementRow) {
  return b.date.getTime() - a.date.getTime() || b.id.localeCompare(a.id);
}

function resolveAccountName(
  accountId: string | null | undefined,
  accountMap: Map<string, BankAccount>,
) {
  if (!accountId) return null;
  return accountMap.get(accountId)?.account_name ?? null;
}

function getCurrency(accounts: BankAccount[]): Currency {
  return accounts[0]?.currency ?? "DOP";
}

export function useDailyCloseReport(params: {
  incomes: Income[];
  expenses: Expense[];
  accounts: BankAccount[];
  selectedDate: string;
  selectedBranchId: string;
}) {
  const { incomes, expenses, accounts, selectedDate, selectedBranchId } = params;

  return React.useMemo(() => {
    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    if (!selectedDate || !selectedBranchId) {
      return {
        currency: getCurrency(accounts),
        summary: {
          cashIncome: 0,
          transferIncome: 0,
          expenses: 0,
          net: 0,
        } as DailyCloseSummary,
        cashIncomeRows: [] as DailyCloseIncomeRow[],
        transferIncomeRows: [] as DailyCloseIncomeRow[],
        expenseRows: [] as DailyCloseExpenseRow[],
        movementRows: [] as DailyCloseMovementRow[],
      };
    }

    const cashIncomeRows: DailyCloseIncomeRow[] = [];
    const transferIncomeRows: DailyCloseIncomeRow[] = [];
    const expenseRows: DailyCloseExpenseRow[] = [];

    incomes.forEach((income) => {
      if (income.branch_id !== selectedBranchId) return;
      if (getDateKey(income.date) !== selectedDate) return;

      const parsedDate = parseDate(income.created_at) ?? parseDateOnly(income.date);
      if (!parsedDate) return;

      const row: DailyCloseIncomeRow = {
        id: income.id,
        kind: "income",
        method: income.payment_method,
        amount: Number(income.amount || 0),
        description: income.description?.trim() || "Sin descripción",
        date: parsedDate,
        branchId: income.branch_id,
        bankAccountName: resolveAccountName(income.bank_account_id, accountMap),
      };

      if (income.payment_method === "cash") {
        cashIncomeRows.push(row);
      } else {
        transferIncomeRows.push(row);
      }
    });

    expenses.forEach((expense) => {
      if (expense.branch_id !== selectedBranchId) return;
      if (getDateKey(expense.date) !== selectedDate) return;

      const parsedDate = parseDate(expense.created_at) ?? parseDateOnly(expense.date);
      if (!parsedDate) return;

      expenseRows.push({
        id: expense.id,
        kind: "expense",
        amount: Number(expense.amount || 0),
        description: expense.description?.trim() || "Sin descripción",
        date: parsedDate,
        branchId: expense.branch_id,
        paymentMethod: expense.payment_method,
        bankAccountName: resolveAccountName(expense.bank_account_id, accountMap),
      });
    });

    cashIncomeRows.sort(sortRows);
    transferIncomeRows.sort(sortRows);
    expenseRows.sort(sortRows);

    const summary = {
      cashIncome: cashIncomeRows.reduce((sum, row) => sum + row.amount, 0),
      transferIncome: transferIncomeRows.reduce((sum, row) => sum + row.amount, 0),
      expenses: expenseRows.reduce((sum, row) => sum + row.amount, 0),
      net: 0,
    };

    summary.net = summary.cashIncome + summary.transferIncome - summary.expenses;

    const movementRows = [
      ...cashIncomeRows,
      ...transferIncomeRows,
      ...expenseRows,
    ].sort(sortRows);

    return {
      currency: getCurrency(accounts),
      summary,
      cashIncomeRows,
      transferIncomeRows,
      expenseRows,
      movementRows,
    };
  }, [accounts, expenses, incomes, selectedBranchId, selectedDate]);
}
