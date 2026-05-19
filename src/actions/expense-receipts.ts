"use server";

import {
  extractBranchTypeToken,
  normalizeBranchCode,
  normalizeDateOnly,
  normalizeExpenseTypeFriendlyId,
  normalizeExpenseTypeName,
  normalizeLast4Digits,
  parseExpenseReceiptJson,
  stripBranchTypeToken,
} from "@/lib/expense-receipts";
import { requireAuth } from "@/lib/auth/guards";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BankAccount } from "@/types/bank-account.types";
import type { Branch } from "@/types/branch.types";
import type { ExpenseReceiptAnalysis } from "@/types/expense-receipt.types";
import type { ExpenseType } from "@/types/expense-type.types";

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_RECEIPT_FILE_SIZE = 7 * 1024 * 1024;

interface BankAccountBranchRow {
  bank_account_id: string;
  branch_id: string;
}

const anthropicMessageSchema = {
  parse(value: unknown) {
    if (!value || typeof value !== "object") {
      throw new Error("Respuesta inválida de Claude.");
    }

    const content = (value as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      throw new Error("Respuesta inválida de Claude.");
    }

    return content
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const block = item as { type?: unknown; text?: unknown };
        return block.type === "text" && typeof block.text === "string" ? block.text : "";
      })
      .join("\n")
      .trim();
  },
};

export async function analyzeExpenseReceipt(
  formData: FormData,
): Promise<ExpenseReceiptAnalysis> {
  const session = await requireAuth();
  const fileValue = formData.get("receipt");

  if (!(fileValue instanceof File)) {
    throw new Error("Sube una imagen del comprobante.");
  }

  if (!ACCEPTED_IMAGE_TYPES.has(fileValue.type)) {
    throw new Error("El comprobante debe ser una imagen JPG, PNG, WebP o GIF.");
  }

  if (fileValue.size > MAX_RECEIPT_FILE_SIZE) {
    throw new Error("La imagen no puede superar 7 MB.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Configura ANTHROPIC_API_KEY para analizar comprobantes.");
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const imageBase64 = Buffer.from(await fileValue.arrayBuffer()).toString("base64");
  const claudeText = await requestClaudeReceiptAnalysis({
    apiKey,
    model,
    mediaType: fileValue.type,
    imageBase64,
  });
  const modelData = parseExpenseReceiptJson(claudeText);
  const tokenFromDescription = extractBranchTypeToken(modelData.description);
  const tokenFromText = extractBranchTypeToken(modelData.rawText);
  const token = tokenFromDescription ?? tokenFromText;
  const branchCode =
    token?.branchCode ?? normalizeBranchCode(modelData.branchCode);
  const expenseTypeFriendlyId =
    token?.expenseTypeFriendlyId ??
    normalizeExpenseTypeFriendlyId(modelData.expenseTypeFriendlyId);
  const expenseTypeNameToken =
    token?.expenseTypeName ?? modelData.expenseTypeName;
  const sourceAccountLast4 = normalizeLast4Digits(modelData.sourceAccountLast4);
  const date = normalizeDateOnly(modelData.transactionDate);

  const supabase = await getSupabaseServerClient();
  const [
    branchesResult,
    expenseTypesResult,
    accountsResult,
    accountBranchesResult,
  ] = await Promise.all([
    supabase.from("branches").select("*"),
    supabase.from("expense_types").select("*"),
    supabase.from("bank_accounts").select("*").eq("is_active", true),
    supabase.from("bank_account_branches").select("bank_account_id, branch_id"),
  ]);

  if (branchesResult.error) {
    throw new Error(`Error al leer sucursales: ${branchesResult.error.message}`);
  }
  if (expenseTypesResult.error) {
    throw new Error(`Error al leer tipos de gasto: ${expenseTypesResult.error.message}`);
  }
  if (accountsResult.error) {
    throw new Error(`Error al leer cuentas financieras: ${accountsResult.error.message}`);
  }
  if (accountBranchesResult.error) {
    throw new Error(`Error al leer sucursales de cuentas: ${accountBranchesResult.error.message}`);
  }

  const allowedBranchIds =
    session.user.role === "USER" ? new Set(session.user.branchIds ?? []) : null;
  const branches = ((branchesResult.data ?? []) as Branch[]).filter(
    (branch) => !allowedBranchIds || allowedBranchIds.has(branch.id),
  );
  const expenseTypes = (expenseTypesResult.data ?? []) as ExpenseType[];
  const accounts = (accountsResult.data ?? []) as BankAccount[];
  const accountBranches = (accountBranchesResult.data ?? []) as BankAccountBranchRow[];
  const accountBranchMap = buildAccountBranchMap(accountBranches);

  const branch = branchCode
    ? branches.find((item) => normalizeBranchCode(item.id) === branchCode)
    : null;
  const expenseType = expenseTypeFriendlyId
    ? expenseTypes.find(
        (item) =>
          normalizeExpenseTypeFriendlyId(item.friendly_id) === expenseTypeFriendlyId,
      )
    : matchExpenseTypeByName(expenseTypes, expenseTypeNameToken);
  const account = matchBankAccount({
    accounts,
    accountBranchMap,
    branchId: branch?.id ?? null,
    sourceAccountLast4,
  });
  const issues = [
    ...(modelData.issues ?? []),
    ...buildMatchingIssues({
      branchCode,
      branchFound: Boolean(branch),
      expenseTypeFriendlyId,
      expenseTypeName: expenseTypeNameToken,
      expenseTypeFound: Boolean(expenseType),
      sourceAccountLast4,
      accountMatched: Boolean(account),
    }),
  ];

  if (date && date > new Date().toISOString().slice(0, 10)) {
    issues.push("La fecha detectada está en el futuro; revísala antes de guardar.");
  }

  const descriptionBase = stripBranchTypeToken(modelData.description);
  const description = descriptionBase || buildFallbackDescription(modelData.referenceNumber);

  return {
    amount: modelData.amount,
    date,
    description,
    branchCode,
    branchId: branch?.id ?? null,
    branchName: branch?.name ?? null,
    expenseTypeFriendlyId: expenseType?.friendly_id ?? expenseTypeFriendlyId,
    expenseTypeId: expenseType?.id ?? null,
    expenseTypeName: expenseType?.name ?? null,
    bankAccountId: account?.id ?? null,
    bankAccountName: account?.account_name ?? null,
    sourceAccountLast4,
    referenceNumber: modelData.referenceNumber,
    confirmationNumber: modelData.confirmationNumber,
    transferTax: modelData.transferTax,
    bankName: modelData.bankName,
    confidence: modelData.confidence,
    extractedText: modelData.rawText,
    issues: Array.from(new Set(issues.filter(Boolean))),
  };
}

async function requestClaudeReceiptAnalysis(params: {
  apiKey: string;
  model: string;
  mediaType: string;
  imageBase64: string;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 900,
      temperature: 0,
      system:
        "Eres un extractor de comprobantes bancarios dominicanos. Devuelve solo JSON válido, sin markdown ni explicación.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: params.mediaType,
                data: params.imageBase64,
              },
            },
            {
              type: "text",
              text: [
                "Lee este comprobante y extrae los datos para crear un gasto.",
                "Busca especialmente un token con formato SUCURSAL#TIPO, por ejemplo SDQ-1#Nomina.",
                "El valor despues de # es el nombre del tipo de gasto, no un ID interno.",
                "Devuelve exactamente este JSON:",
                "{",
                '  "amount": number | null,',
                '  "transactionDate": "YYYY-MM-DD" | null,',
                '  "sourceAccountLast4": string | null,',
                '  "referenceNumber": string | null,',
                '  "confirmationNumber": string | null,',
                '  "description": string | null,',
                '  "branchCode": string | null,',
                '  "expenseTypeFriendlyId": string | null,',
                '  "expenseTypeName": string | null,',
                '  "transferTax": number | null,',
                '  "bankName": string | null,',
                '  "rawText": string | null,',
                '  "confidence": number,',
                '  "issues": string[]',
                "}",
                "No inventes IDs. Si un dato no está visible, usa null.",
              ].join("\n"),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();

    if (response.status === 401) {
      throw new Error(
        "Claude rechazó la API key. Revisa ANTHROPIC_API_KEY, genera una key nueva si hace falta y reinicia el servidor de Next.",
      );
    }

    throw new Error(
      `Claude no pudo analizar el comprobante: ${parseClaudeErrorMessage(detail) ?? response.statusText}`,
    );
  }

  return anthropicMessageSchema.parse(await response.json());
}

function parseClaudeErrorMessage(detail: string) {
  try {
    const parsed = JSON.parse(detail) as {
      error?: {
        message?: unknown;
      };
    };

    return typeof parsed.error?.message === "string" ? parsed.error.message : null;
  } catch {
    return detail.trim() || null;
  }
}

function buildAccountBranchMap(rows: BankAccountBranchRow[]) {
  const map = new Map<string, string[]>();

  for (const row of rows) {
    const branchIds = map.get(row.bank_account_id) ?? [];
    branchIds.push(row.branch_id);
    map.set(row.bank_account_id, branchIds);
  }

  return map;
}

function matchBankAccount(params: {
  accounts: BankAccount[];
  accountBranchMap: Map<string, string[]>;
  branchId: string | null;
  sourceAccountLast4: string | null;
}) {
  if (!params.branchId || !params.sourceAccountLast4) return null;

  const branchId = params.branchId;
  const sourceAccountLast4 = params.sourceAccountLast4;
  const matches = params.accounts.filter((account) => {
    const accountDigits = account.account_number?.replace(/\D/g, "") ?? "";
    const linkedBranchIds = params.accountBranchMap.get(account.id) ?? [];
    const supportsBranch =
      account.branch_id === branchId || linkedBranchIds.includes(branchId);

    return supportsBranch && accountDigits.endsWith(sourceAccountLast4);
  });

  return matches.length === 1 ? matches[0] : null;
}

function matchExpenseTypeByName(
  expenseTypes: ExpenseType[],
  expenseTypeName: string | null,
) {
  const normalizedName = normalizeExpenseTypeName(expenseTypeName);
  if (!normalizedName) return null;

  const matches = expenseTypes.filter(
    (item) => normalizeExpenseTypeName(item.name) === normalizedName,
  );

  return matches.length === 1 ? matches[0] : null;
}

function buildMatchingIssues(params: {
  branchCode: string | null;
  branchFound: boolean;
  expenseTypeFriendlyId: string | null;
  expenseTypeName: string | null;
  expenseTypeFound: boolean;
  sourceAccountLast4: string | null;
  accountMatched: boolean;
}) {
  const issues: string[] = [];

  if (!params.branchCode) {
    issues.push("No se detectó código de sucursal.");
  } else if (!params.branchFound) {
    issues.push(`No se encontró la sucursal ${params.branchCode}.`);
  }

  if (!params.expenseTypeFriendlyId && !params.expenseTypeName) {
    issues.push("No se detectó tipo de gasto.");
  } else if (!params.expenseTypeFound) {
    issues.push(
      `No se encontró el tipo de gasto ${params.expenseTypeFriendlyId ?? params.expenseTypeName}.`,
    );
  }

  if (params.sourceAccountLast4 && !params.accountMatched) {
    issues.push(`No se pudo empatar la cuenta terminada en ${params.sourceAccountLast4}.`);
  }

  return issues;
}

function buildFallbackDescription(referenceNumber: string | null) {
  return referenceNumber ? `Gasto desde comprobante ${referenceNumber}` : "Gasto desde comprobante";
}
