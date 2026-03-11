import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { BankAccount } from "@/types/bank-account.types";
import { BankTransaction } from "@/types/bank-transaction.types";
import { Expense } from "@/types/expense.types";
import { Income } from "@/types/income.types";

type FinancialMovementKind = "income" | "expense";
type FinancialMovement = Income | Expense;
type MovementCollection = "incomes" | "expenses";

type DeleteFinancialMovementResult = {
  bankAccountId?: string;
  historyRepaired: boolean;
};

type ListedBankTransaction = {
  id: string;
  ref: DocumentReference;
  data: BankTransaction;
};

const MAX_BATCH_OPERATIONS = 450;

const MOVEMENT_CONFIG: Record<
  FinancialMovementKind,
  {
    collectionName: MovementCollection;
    label: string;
    linkedField: "linkedIncomeId" | "linkedExpenseId";
    balanceDelta: (amount: number) => number;
  }
> = {
  income: {
    collectionName: "incomes",
    label: "ingreso",
    linkedField: "linkedIncomeId",
    balanceDelta: (amount) => -amount,
  },
  expense: {
    collectionName: "expenses",
    label: "gasto",
    linkedField: "linkedExpenseId",
    balanceDelta: (amount) => amount,
  },
};

function toMillis(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  const timestampLike = value as { toMillis?: () => number } | null;

  if (
    timestampLike &&
    typeof timestampLike === "object" &&
    typeof timestampLike.toMillis === "function"
  ) {
    return timestampLike.toMillis();
  }

  return 0;
}

function getBankTransactionEffect(
  transaction: Pick<BankTransaction, "amount" | "type">,
): number {
  const amount = Number(transaction.amount ?? 0);

  switch (transaction.type) {
    case "deposit":
    case "transfer_in":
      return Math.abs(amount);
    case "withdrawal":
    case "transfer_out":
      return -Math.abs(amount);
    case "adjustment":
      return amount;
    default: {
      const exhaustiveType: never = transaction.type;
      throw new Error(`Tipo de transaccion bancaria no soportado: ${exhaustiveType}`);
    }
  }
}

function compareTransactionsDesc(
  a: ListedBankTransaction,
  b: ListedBankTransaction,
): number {
  return (
    toMillis(b.data.date) - toMillis(a.data.date) ||
    toMillis(b.data.createdAt) - toMillis(a.data.createdAt) ||
    b.id.localeCompare(a.id)
  );
}

async function listBankTransactions(
  bankAccountId: string,
): Promise<ListedBankTransaction[]> {
  const transactionsRef = collection(db, "bankTransactions");
  const transactionsQuery = query(
    transactionsRef,
    where("bankAccountId", "==", bankAccountId),
  );
  const snapshot = await getDocs(transactionsQuery);

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ref: docSnap.ref,
      data: {
        id: docSnap.id,
        ...docSnap.data(),
      } as BankTransaction,
    }))
    .sort(compareTransactionsDesc);
}

async function resolveLinkedBankContext(
  kind: FinancialMovementKind,
  movement: FinancialMovement,
): Promise<{ bankAccountId?: string; bankTransactionId?: string }> {
  let bankAccountId = movement.bankAccountId;
  let bankTransactionId = movement.bankTransactionId;

  if (bankTransactionId) {
    const bankTransactionRef = doc(db, "bankTransactions", bankTransactionId);
    const bankTransactionSnap = await getDoc(bankTransactionRef);

    if (bankTransactionSnap.exists()) {
      const bankTransaction = {
        id: bankTransactionSnap.id,
        ...bankTransactionSnap.data(),
      } as BankTransaction;
      bankAccountId ??= bankTransaction.bankAccountId;
      return { bankAccountId, bankTransactionId };
    }

    bankTransactionId = undefined;
  }

  if (!bankAccountId) {
    return {};
  }

  const transactions = await listBankTransactions(bankAccountId);
  const linkedTransaction = transactions.find(
    ({ data }) => data[MOVEMENT_CONFIG[kind].linkedField] === movement.id,
  );

  return {
    bankAccountId,
    bankTransactionId: linkedTransaction?.id,
  };
}

export async function repairBankTransactionBalances(
  bankAccountId: string,
): Promise<void> {
  if (!bankAccountId) {
    return;
  }

  const accountRef = doc(db, "bankAccounts", bankAccountId);
  const [accountSnap, transactions] = await Promise.all([
    getDoc(accountRef),
    listBankTransactions(bankAccountId),
  ]);

  if (!accountSnap.exists()) {
    return;
  }

  const account = accountSnap.data() as BankAccount;
  const currentBalance = Number(account.currentBalance ?? 0);

  if (!Number.isFinite(currentBalance)) {
    throw new Error("La cuenta financiera asociada tiene un balance invalido.");
  }

  const sortedTransactions = [...transactions].sort(compareTransactionsDesc);
  let runningBalance = currentBalance;
  let batch = writeBatch(db);
  let writesInBatch = 0;

  for (const transaction of sortedTransactions) {
    if (transaction.data.balanceAfter !== runningBalance) {
      batch.update(transaction.ref, { balanceAfter: runningBalance });
      writesInBatch += 1;

      if (writesInBatch >= MAX_BATCH_OPERATIONS) {
        await batch.commit();
        batch = writeBatch(db);
        writesInBatch = 0;
      }
    }

    runningBalance -= getBankTransactionEffect(transaction.data);
  }

  if (writesInBatch > 0) {
    await batch.commit();
  }
}

async function deleteFinancialMovement(
  kind: FinancialMovementKind,
  movementId: string,
): Promise<DeleteFinancialMovementResult> {
  const { collectionName, label, balanceDelta } = MOVEMENT_CONFIG[kind];
  const movementRef = doc(db, collectionName, movementId);
  const movementSnap = await getDoc(movementRef);

  if (!movementSnap.exists()) {
    throw new Error(`El ${label} ya no existe o fue eliminado.`);
  }

  const movement = {
    id: movementSnap.id,
    ...movementSnap.data(),
  } as FinancialMovement;
  const fallbackContext = await resolveLinkedBankContext(kind, movement);

  const bankAccountId = await runTransaction(db, async (transaction) => {
    const freshMovementSnap = await transaction.get(movementRef);

    if (!freshMovementSnap.exists()) {
      throw new Error(`El ${label} ya no existe o fue eliminado.`);
    }

    const freshMovement = {
      id: freshMovementSnap.id,
      ...freshMovementSnap.data(),
    } as FinancialMovement;
    const amount = Number(freshMovement.amount ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`El ${label} no tiene un monto valido.`);
    }

    const linkedBankTransactionId =
      freshMovement.bankTransactionId ?? fallbackContext.bankTransactionId;
    const linkedBankTransactionRef = linkedBankTransactionId
      ? doc(db, "bankTransactions", linkedBankTransactionId)
      : null;
    const linkedBankTransactionSnap = linkedBankTransactionRef
      ? await transaction.get(linkedBankTransactionRef)
      : null;
    const linkedBankTransaction = linkedBankTransactionSnap?.exists()
      ? (linkedBankTransactionSnap.data() as BankTransaction)
      : null;
    const targetAccountId =
      freshMovement.bankAccountId ??
      linkedBankTransaction?.bankAccountId ??
      fallbackContext.bankAccountId;
    let repairedAccountId: string | undefined;

    if (targetAccountId) {
      const accountRef = doc(db, "bankAccounts", targetAccountId);
      const accountSnap = await transaction.get(accountRef);

      if (accountSnap.exists()) {
        const account = accountSnap.data() as BankAccount;
        const currentBalance = Number(account.currentBalance ?? 0);

        if (!Number.isFinite(currentBalance)) {
          throw new Error(
            "La cuenta financiera asociada tiene un balance invalido.",
          );
        }

        transaction.update(accountRef, {
          currentBalance: currentBalance + balanceDelta(amount),
        });
        repairedAccountId = targetAccountId;
      }
    }

    if (linkedBankTransactionRef && linkedBankTransactionSnap?.exists()) {
      transaction.delete(linkedBankTransactionRef);
    }

    transaction.delete(movementRef);

    return repairedAccountId;
  });

  if (!bankAccountId) {
    return {
      historyRepaired: true,
    };
  }

  try {
    await repairBankTransactionBalances(bankAccountId);
    return {
      bankAccountId,
      historyRepaired: true,
    };
  } catch (error) {
    console.error("No se pudo reparar el historial bancario", error);
    return {
      bankAccountId,
      historyRepaired: false,
    };
  }
}

export async function deleteIncome(
  incomeId: string,
): Promise<DeleteFinancialMovementResult> {
  return deleteFinancialMovement("income", incomeId);
}

export async function deleteExpense(
  expenseId: string,
): Promise<DeleteFinancialMovementResult> {
  return deleteFinancialMovement("expense", expenseId);
}
