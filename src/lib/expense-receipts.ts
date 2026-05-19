import { z } from "zod";

const branchTypeTokenRegex =
  /\b([A-Za-z]+[\s_-]*\d+)\s*#\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_-]{0,60})\b/i;

function normalizeLooseString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseCurrencyAmount(value: unknown): number | null {
  const raw = normalizeLooseString(value);
  if (!raw) return null;

  const normalized = raw
    .replace(/RD\$/gi, "")
    .replace(/DOP/gi, "")
    .replace(/[^\d.,-]/g, "")
    .trim();

  if (!normalized) return null;

  const decimalComma =
    normalized.includes(",") &&
    (!normalized.includes(".") || normalized.lastIndexOf(",") > normalized.lastIndexOf("."));
  const numericText = decimalComma
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized.replace(/,/g, "");
  const parsed = Number(numericText);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

function parseConfidence(value: unknown): number | null {
  const parsed = parseCurrencyAmount(value);
  if (parsed === null) return null;

  if (parsed > 1 && parsed <= 100) {
    return Math.round((parsed / 100) * 100) / 100;
  }

  return parsed >= 0 && parsed <= 1 ? parsed : null;
}

export function normalizeBranchCode(value: string | null | undefined) {
  const raw = normalizeLooseString(value);
  if (!raw) return null;

  const cleaned = raw
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
  const match = cleaned.match(/^([A-Z]+)-?0*(\d+)$/);

  return match ? `${match[1]}-${Number(match[2])}` : cleaned;
}

export function normalizeExpenseTypeFriendlyId(value: string | null | undefined) {
  const raw = normalizeLooseString(value);
  if (!raw) return null;

  const cleaned = raw.toUpperCase().replace(/\s+/g, "").replace(/_/g, "-");
  const match = cleaned.match(/^ETY-?0*(\d{1,10})$/);
  if (!match) return null;

  return `ETY-${match[1].padStart(6, "0")}`;
}

export function normalizeExpenseTypeName(value: string | null | undefined) {
  const raw = normalizeLooseString(value);
  if (!raw) return null;

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

export function normalizeLast4Digits(value: string | null | undefined) {
  const raw = normalizeLooseString(value);
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;

  return digits.slice(-4);
}

export function extractBranchTypeToken(text: string | null | undefined) {
  const raw = normalizeLooseString(text);
  if (!raw) return null;

  const match = raw.match(branchTypeTokenRegex);
  if (!match) return null;

  return {
    rawToken: match[0],
    branchCode: normalizeBranchCode(match[1]),
    expenseTypeToken: match[2].trim(),
    expenseTypeFriendlyId: normalizeExpenseTypeFriendlyId(match[2]),
    expenseTypeName: match[2].replace(/[_-]+/g, " ").trim(),
  };
}

export function stripBranchTypeToken(text: string | null | undefined) {
  const raw = normalizeLooseString(text);
  if (!raw) return "";

  return raw
    .replace(branchTypeTokenRegex, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

export function normalizeDateOnly(value: string | null | undefined) {
  const raw = normalizeLooseString(value);
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    return `${slashMatch[3]}-${month}-${day}`;
  }

  return null;
}

const nullableStringSchema = z
  .unknown()
  .optional()
  .transform((value) => normalizeLooseString(value));

const nullableNumberSchema = z
  .unknown()
  .optional()
  .transform((value) => parseCurrencyAmount(value));

const confidenceSchema = z
  .unknown()
  .optional()
  .transform((value) => parseConfidence(value));

export const expenseReceiptModelSchema = z
  .object({
    amount: nullableNumberSchema,
    transactionDate: nullableStringSchema,
    sourceAccountLast4: nullableStringSchema,
    referenceNumber: nullableStringSchema,
    confirmationNumber: nullableStringSchema,
    description: nullableStringSchema,
    branchCode: nullableStringSchema,
    expenseTypeFriendlyId: nullableStringSchema,
    expenseTypeName: nullableStringSchema,
    transferTax: nullableNumberSchema,
    bankName: nullableStringSchema,
    rawText: nullableStringSchema,
    confidence: confidenceSchema,
    issues: z.array(z.string()).optional().catch([]),
  })
  .passthrough();

export type ExpenseReceiptModelData = z.infer<typeof expenseReceiptModelSchema>;

export function parseExpenseReceiptJson(text: string): ExpenseReceiptModelData {
  const trimmed = text.trim();
  const direct = safeJsonParse(trimmed);

  if (direct !== null) {
    return expenseReceiptModelSchema.parse(direct);
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("La IA no devolvió un JSON válido.");
  }

  const extracted = trimmed.slice(firstBrace, lastBrace + 1);
  const parsed = safeJsonParse(extracted);

  if (parsed === null) {
    throw new Error("La IA no devolvió un JSON válido.");
  }

  return expenseReceiptModelSchema.parse(parsed);
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
