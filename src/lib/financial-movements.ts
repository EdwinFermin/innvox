/**
 * @deprecated This module is a backward-compatibility shim.
 * Prefer importing deleteIncome / deleteExpense directly from
 * `@/actions/incomes` and `@/actions/expenses` respectively.
 * The Firestore transaction logic has been replaced by PostgreSQL
 * functions invoked through server actions.
 */

export { deleteIncome } from "@/actions/incomes";
export { deleteExpense } from "@/actions/expenses";
