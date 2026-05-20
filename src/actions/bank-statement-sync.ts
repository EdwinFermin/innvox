"use server";

import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveSessionUserId } from "@/lib/auth/session-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type {
  BankStatementImportPreview,
  ParsedBankStatement,
} from "@/types/bank-statement-sync.types";

const movementSchema = z.object({
  source_fingerprint: z.string().min(1),
  external_reference: z.string().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  transaction_type: z.enum(["deposit", "withdrawal"]),
  amount: z.number().positive(),
  debit_amount: z.number().nullable(),
  credit_amount: z.number().nullable(),
  statement_balance_after: z.number().nullable(),
  raw_payload: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

const parsedStatementSchema = z.object({
  bank_name: z.string().nullable(),
  statement_account_number: z.string().nullable(),
  statement_account_last4: z.string().nullable(),
  currency: z.enum(["DOP", "USD"]),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  opening_balance: z.number().nullable(),
  closing_balance: z.number().nullable(),
  movements: z.array(movementSchema).min(1),
  issues: z.array(z.string()),
});

const createImportSchema = z.object({
  bankAccountId: z.string().uuid(),
  fileName: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  parsedStatement: parsedStatementSchema,
});

const DATE_MATCH_WINDOW_DAYS = 3;
const SMALL_AMOUNT_TOLERANCE = 1;
const RELATIVE_AMOUNT_TOLERANCE = 0.01;
const MAX_RELATIVE_AMOUNT_TOLERANCE = 500;
const STRONG_DUPLICATE_THRESHOLD = 6;
const REVIEW_DUPLICATE_THRESHOLD = 3;
const REFERENCE_TOKEN_REGEX = /\d{6,}/g;

export async function createBankStatementImport(input: {
  bankAccountId: string;
  fileName: string;
  fileSize: number;
  parsedStatement: ParsedBankStatement;
}): Promise<BankStatementImportPreview> {
  const session = await requirePermission(PERMISSIONS.settingsManage);
  const values = createImportSchema.parse(input);
  const supabase = await getSupabaseServerClient();
  const createdBy = await resolveSessionUserId(session, supabase);

  const { data: account, error: accountError } = await supabase
    .from("bank_accounts")
    .select("id, account_number, account_type, currency")
    .eq("id", values.bankAccountId)
    .single();

  if (accountError || !account) {
    throw new Error("No se encontró la cuenta bancaria seleccionada.");
  }

  if (account.account_type !== "bank") {
    throw new Error("Solo las cuentas bancarias pueden sincronizar estados.");
  }

  const accountLast4 = account.account_number?.replace(/\D/g, "").slice(-4) || null;
  const issues = [...values.parsedStatement.issues];
  if (
    accountLast4 &&
    values.parsedStatement.statement_account_last4 &&
    accountLast4 !== values.parsedStatement.statement_account_last4
  ) {
    issues.push("El número de cuenta del PDF no coincide con la cuenta seleccionada.");
  }

  const fingerprints = values.parsedStatement.movements.map(
    (movement) => movement.source_fingerprint,
  );
  const firstDate = values.parsedStatement.movements
    .map((movement) => movement.transaction_date)
    .sort()[0];
  const lastDate = values.parsedStatement.movements
    .map((movement) => movement.transaction_date)
    .sort()
    .at(-1);

  const [sourceMatches, dateMatches] = await Promise.all([
    fingerprints.length > 0
      ? supabase
          .from("bank_transactions")
          .select("id, source_fingerprint")
          .eq("bank_account_id", values.bankAccountId)
          .in("source_fingerprint", fingerprints)
      : Promise.resolve({ data: [], error: null }),
    firstDate && lastDate
      ? supabase
          .from("bank_transactions")
          .select("id, type, amount, date, description, balance_after, external_reference")
          .eq("bank_account_id", values.bankAccountId)
          .gte("date", shiftDate(firstDate, -DATE_MATCH_WINDOW_DAYS))
          .lte("date", `${shiftDate(lastDate, DATE_MATCH_WINDOW_DAYS)}T23:59:59.999Z`)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (sourceMatches.error) {
    throw new Error(`Error al comparar movimientos existentes: ${sourceMatches.error.message}`);
  }
  if (dateMatches.error) {
    throw new Error(`Error al leer movimientos existentes: ${dateMatches.error.message}`);
  }

  const matchedByFingerprint = new Map(
    (sourceMatches.data ?? [])
      .filter((row) => row.source_fingerprint)
      .map((row) => [row.source_fingerprint!, row.id]),
  );
  const existingTransactions = dateMatches.data ?? [];
  const reusableExistingMatches = buildReusableExistingMatches(existingTransactions);
  const usedExistingTransactionIds = new Set<string>();

  const { data: statementImport, error: importError } = await supabase
    .from("bank_statement_imports")
    .insert({
      bank_account_id: values.bankAccountId,
      file_name: values.fileName,
      file_size: values.fileSize,
      bank_name: values.parsedStatement.bank_name,
      statement_account_number: values.parsedStatement.statement_account_number,
      statement_account_last4: values.parsedStatement.statement_account_last4,
      currency: values.parsedStatement.currency,
      period_start: values.parsedStatement.period_start,
      period_end: values.parsedStatement.period_end,
      opening_balance: values.parsedStatement.opening_balance,
      closing_balance: values.parsedStatement.closing_balance,
      summary: {
        issues,
        movement_count: values.parsedStatement.movements.length,
      },
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (importError || !statementImport) {
    throw new Error(`Error al crear la revisión del estado: ${importError?.message}`);
  }

  const rows = values.parsedStatement.movements.map((movement) => {
    const matchedBySource = matchedByFingerprint.get(movement.source_fingerprint) ?? null;
    const fingerprintMatchId =
      matchedBySource && !usedExistingTransactionIds.has(matchedBySource) ? matchedBySource : null;

    const fuzzyMatch = fingerprintMatchId
      ? null
      : takeExistingMatch(reusableExistingMatches, movement, usedExistingTransactionIds);

    const matchedId = fingerprintMatchId ?? fuzzyMatch?.id ?? null;

    if (matchedId) {
      usedExistingTransactionIds.add(matchedId);
    }

    let status: "duplicate" | "conflict" | "new";
    if (fingerprintMatchId) {
      status = "duplicate";
    } else if (fuzzyMatch && fuzzyMatch.score >= STRONG_DUPLICATE_THRESHOLD) {
      status = "duplicate";
    } else if (fuzzyMatch) {
      status = "conflict";
    } else {
      status = "new";
    }

    return {
      import_id: statementImport.id,
      bank_account_id: values.bankAccountId,
      source_fingerprint: movement.source_fingerprint,
      external_reference: movement.external_reference,
      transaction_date: movement.transaction_date,
      description: movement.description,
      transaction_type: movement.transaction_type,
      amount: movement.amount,
      debit_amount: movement.debit_amount,
      credit_amount: movement.credit_amount,
      statement_balance_after: movement.statement_balance_after,
      status,
      matched_bank_transaction_id: matchedId,
      raw_payload: movement.raw_payload as Json,
    };
  });

  const { data: items, error: itemsError } = await supabase
    .from("bank_statement_import_items")
    .insert(rows)
    .select("*")
    .order("transaction_date", { ascending: true });

  if (itemsError || !items) {
    throw new Error(`Error al guardar movimientos detectados: ${itemsError?.message}`);
  }

  return {
    id: statementImport.id,
    bank_account_id: statementImport.bank_account_id,
    file_name: statementImport.file_name,
    bank_name: statementImport.bank_name,
    statement_account_number: statementImport.statement_account_number,
    statement_account_last4: statementImport.statement_account_last4,
    currency: statementImport.currency ?? account.currency,
    period_start: statementImport.period_start,
    period_end: statementImport.period_end,
    opening_balance: statementImport.opening_balance,
    closing_balance: statementImport.closing_balance,
    issues,
    items: items.map((item) => ({
      id: item.id,
      source_fingerprint: item.source_fingerprint,
      external_reference: item.external_reference,
      transaction_date: item.transaction_date,
      description: item.description ?? "Movimiento bancario",
      transaction_type: item.transaction_type,
      amount: item.amount,
      debit_amount: item.debit_amount,
      credit_amount: item.credit_amount,
      statement_balance_after: item.statement_balance_after,
      status: item.status,
      matched_bank_transaction_id: item.matched_bank_transaction_id,
      raw_payload: values.parsedStatement.movements.find(
        (movement) => movement.source_fingerprint === item.source_fingerprint,
      )?.raw_payload ?? {},
    })),
  };
}

interface ExistingBankTransaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string | null;
  balance_after: number;
  external_reference: string | null;
}

function buildReusableExistingMatches(
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    description: string | null;
    balance_after: number;
    external_reference: string | null;
  }>,
) {
  const matches = new Map<string, ExistingBankTransaction[]>();

  for (const transaction of transactions) {
    const transactionType = normalizeExistingTransactionDirection(transaction);
    if (!transactionType) continue;

    const transactionDate = transaction.date.slice(0, 10);
    const key = getStatementMatchKey({
      date: transactionDate,
      type: transactionType,
      amount: Math.abs(Number(transaction.amount)),
    });
    const existing = matches.get(key) ?? [];
    existing.push(transaction);
    matches.set(key, existing);
  }

  return matches;
}

function takeExistingMatch(
  reusableExistingMatches: Map<string, ExistingBankTransaction[]>,
  movement: ParsedBankStatement["movements"][number],
  usedExistingTransactionIds: Set<string>,
): { id: string; score: number } | null {
  const exactKey = getStatementMatchKey({
    date: movement.transaction_date,
    type: movement.transaction_type,
    amount: movement.amount,
  });
  const candidates = [
    ...(reusableExistingMatches.get(exactKey) ?? []),
    ...getNearbyExistingMatches(reusableExistingMatches, movement),
  ].filter((transaction, index, items) => {
    if (usedExistingTransactionIds.has(transaction.id)) return false;
    return items.findIndex((item) => item.id === transaction.id) === index;
  });

  if (candidates.length === 0) return null;

  const normalizedMovementDescription = normalizeDescription(movement.description);
  const movementReferenceTokens = extractReferenceTokens(
    movement.description,
    movement.external_reference,
    typeof movement.raw_payload?.reference === "string"
      ? (movement.raw_payload.reference as string)
      : null,
  );
  const scoredMatches = candidates
    .map((transaction) => ({
      transaction,
      score: getDuplicateScore(
        transaction,
        movement,
        normalizedMovementDescription,
        movementReferenceTokens,
      ),
    }))
    .filter((match) => match.score >= REVIEW_DUPLICATE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  const top = scoredMatches[0];
  return top ? { id: top.transaction.id, score: top.score } : null;
}

function normalizeExistingTransactionDirection(
  transaction: Pick<ExistingBankTransaction, "type" | "amount">,
) {
  if (transaction.type === "deposit" || transaction.type === "transfer_in") {
    return "deposit";
  }

  if (
    transaction.type === "withdrawal" ||
    transaction.type === "transfer_out" ||
    transaction.type === "lbtr_fee" ||
    transaction.type === "transfer_tax"
  ) {
    return "withdrawal";
  }

  if (transaction.type === "adjustment") {
    return Number(transaction.amount) >= 0 ? "deposit" : "withdrawal";
  }

  return null;
}

function getStatementMatchKey(params: {
  date: string;
  type: "deposit" | "withdrawal";
  amount: number;
}) {
  return `${params.date}|${params.type}|${Math.abs(params.amount).toFixed(2)}`;
}

function getNearbyExistingMatches(
  reusableExistingMatches: Map<string, ExistingBankTransaction[]>,
  movement: ParsedBankStatement["movements"][number],
) {
  const matches: ExistingBankTransaction[] = [];

  for (let offset = -DATE_MATCH_WINDOW_DAYS; offset <= DATE_MATCH_WINDOW_DAYS; offset += 1) {
    const date = shiftDate(movement.transaction_date, offset);

    for (const [key, transactions] of reusableExistingMatches.entries()) {
      const [transactionDate, transactionType] = key.split("|");
      if (transactionDate !== date || transactionType !== movement.transaction_type) continue;

      matches.push(
        ...transactions.filter((transaction) =>
          isAmountClose(Number(transaction.amount), movement.amount),
        ),
      );
    }
  }

  return matches;
}

function getDuplicateScore(
  transaction: ExistingBankTransaction,
  movement: ParsedBankStatement["movements"][number],
  normalizedMovementDescription: string,
  movementReferenceTokens: Set<string>,
) {
  let score = 0;
  const transactionDescription = normalizeDescription(transaction.description);
  const transactionDate = transaction.date.slice(0, 10);
  const amountDifference = Math.abs(Math.abs(Number(transaction.amount)) - movement.amount);

  if (transactionDate === movement.transaction_date) {
    score += 2;
  } else if (Math.abs(daysBetween(transactionDate, movement.transaction_date)) <= DATE_MATCH_WINDOW_DAYS) {
    score += 1;
  }

  if (amountDifference < 0.01) {
    score += 3;
  } else if (amountDifference <= SMALL_AMOUNT_TOLERANCE) {
    score += 2;
  } else if (isAmountClose(Number(transaction.amount), movement.amount)) {
    score += 1;
  }

  if (
    transactionDescription &&
    (normalizedMovementDescription.includes(transactionDescription) ||
      transactionDescription.includes(normalizedMovementDescription))
  ) {
    score += 3;
  } else if (hasUsefulTokenOverlap(transactionDescription, normalizedMovementDescription)) {
    score += 2;
  }

  if (
    movement.statement_balance_after !== null &&
    Math.abs(Number(transaction.balance_after) - movement.statement_balance_after) < 0.01
  ) {
    score += 1;
  }

  if (movementReferenceTokens.size > 0) {
    const transactionReferenceTokens = extractReferenceTokens(
      transaction.description,
      transaction.external_reference,
    );
    if (hasReferenceTokenOverlap(movementReferenceTokens, transactionReferenceTokens)) {
      score += 4;
    }
  }

  return score;
}

function extractReferenceTokens(...sources: Array<string | null | undefined>): Set<string> {
  const tokens = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    const matches = String(source).match(REFERENCE_TOKEN_REGEX);
    if (!matches) continue;
    for (const match of matches) {
      tokens.add(match);
    }
  }
  return tokens;
}

function hasReferenceTokenOverlap(first: Set<string>, second: Set<string>) {
  if (first.size === 0 || second.size === 0) return false;
  for (const token of first) {
    if (second.has(token)) return true;
  }
  return false;
}

function isAmountClose(existingAmount: number, statementAmount: number) {
  const difference = Math.abs(Math.abs(existingAmount) - Math.abs(statementAmount));
  const relativeTolerance = Math.min(
    Math.abs(statementAmount) * RELATIVE_AMOUNT_TOLERANCE,
    MAX_RELATIVE_AMOUNT_TOLERANCE,
  );

  return difference <= Math.max(SMALL_AMOUNT_TOLERANCE, relativeTolerance);
}

function hasUsefulTokenOverlap(first: string, second: string) {
  const firstTokens = new Set(getUsefulTokens(first));
  const secondTokens = getUsefulTokens(second);

  if (firstTokens.size === 0 || secondTokens.length === 0) return false;

  return secondTokens.some((token) => firstTokens.has(token));
}

function getUsefulTokens(value: string) {
  const ignored = new Set([
    "pago",
    "recibo",
    "transferencia",
    "desde",
    "de",
    "del",
    "por",
    "banco",
    "deposito",
    "cuenta",
    "cargo",
    "balance",
    "promedio",
    "minimo",
  ]);

  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !ignored.has(token));
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(first: string, second: string) {
  const firstTime = new Date(`${first}T00:00:00.000Z`).getTime();
  const secondTime = new Date(`${second}T00:00:00.000Z`).getTime();
  return Math.round((firstTime - secondTime) / 86_400_000);
}

function normalizeDescription(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
