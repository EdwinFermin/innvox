import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import type {
  BankStatementMovement,
  ParsedBankStatement,
} from "@/types/bank-statement-sync.types";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface PdfTextItem {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
}

interface ParsedLineMovement {
  date: string;
  reference: string | null;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
}

const MONTHS: Record<string, number> = {
  ENE: 1,
  JAN: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
  DEC: 12,
};

const DATE_DD_MM_YYYY = /\b\d{2}\/\d{2}\/\d{4}\b/;

export async function parseBankStatementPdf(file: File): Promise<ParsedBankStatement> {
  const text = await extractPdfText(file);
  if (!text.trim()) {
    throw new Error("El PDF no contiene texto seleccionable.");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);

  const parser = detectParser(text);
  const parsed =
    parser === "popular"
      ? parsePopularStatement(text, lines)
      : parser === "bhd"
        ? parseBhdStatement(text, lines)
        : parseGenericMovementsStatement(text, lines);

  if (parsed.movements.length === 0) {
    throw new Error("No se detectaron movimientos bancarios en el PDF.");
  }

  return parsed;
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const positionedItems = (content.items as PdfTextItem[])
      .map((item) => ({
        text: item.str?.trim() ?? "",
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
      }))
      .filter((item) => item.text);

    const rows = new Map<number, { text: string; x: number }[]>();
    for (const item of positionedItems) {
      const yKey = Math.round(item.y / 3) * 3;
      rows.set(yKey, [...(rows.get(yKey) ?? []), { text: item.text, x: item.x }]);
    }

    const pageLines = Array.from(rows.entries())
      .sort(([a], [b]) => b - a)
      .map(([, row]) =>
        row
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text)
          .join(" "),
      );

    pages.push(pageLines.join("\n"));
  }

  return pages.join("\n");
}

function detectParser(text: string) {
  const normalized = text.toUpperCase();
  if (normalized.includes("BANCO MÚLTIPLE BHD") || normalized.includes("BANCO MULTIPLE BHD")) {
    return "bhd";
  }
  if (normalized.includes("CUENTA DIGITAL LIBRE") && normalized.includes("BALANCE AL CORTE")) {
    return "popular";
  }
  return "generic";
}

function parseBhdStatement(text: string, lines: string[]): ParsedBankStatement {
  const movements: ParsedLineMovement[] = [];
  const accountNumber = matchFirst(text, /Numero de Cuenta\s+([X\d-]+)/i);
  const periodEnd = parseDdMmYyyy(matchFirst(text, /Fecha de Corte\s+(\d{2}\/\d{2}\/\d{4})/i));
  const openingBalance = parseAmount(matchFirst(text, /Balance Inicial\s+\$?([\d,.]+)/i));
  const closingBalance = parseAmount(matchFirst(text, /Balance Final\s+\$?([\d,.]+)/i));

  for (const line of lines) {
    const match = line.match(
      /^(\d{2}\/\d{2}\/\d{4})\s+(\S+)\s+(.+?)\s+\$?([\d,.]+)\s+\$?([\d,.]+)\s+\$?([\d,.]+)$/,
    );

    if (!match) continue;

    const debit = parseAmount(match[4]);
    const credit = parseAmount(match[5]);
    const balance = parseAmount(match[6]);
    if ((debit ?? 0) === 0 && (credit ?? 0) === 0) continue;

    movements.push({
      date: parseDdMmYyyy(match[1]) ?? "",
      reference: match[2],
      description: match[3],
      debit: debit && debit > 0 ? debit : null,
      credit: credit && credit > 0 ? credit : null,
      balance,
    });
  }

  return buildStatement({
    bankName: "Banco BHD",
    accountNumber,
    periodStart: inferPeriodStart(movements),
    periodEnd,
    openingBalance,
    closingBalance,
    movements,
    issues: [],
  });
}

function parsePopularStatement(text: string, lines: string[]): ParsedBankStatement {
  const movements: ParsedLineMovement[] = [];
  const accountNumber = matchFirst(text, /CUENTA DIGITAL LIBRE\s+(\d+)/i);
  const periodEnd = parsePopularHeaderDate(matchFirst(text, /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i));
  const openingBalance = parseAmount(matchFirst(text, /BALANCE ANTERIOR\s+([\d,.]+)/i));
  const closingBalance = parseAmount(matchFirst(text, /BALANCE AL CORTE\s+([\d,.]+)/i));

  let currentYear = periodEnd ? Number(periodEnd.slice(0, 4)) : new Date().getFullYear();
  const blocks = collectBlocks(lines, (line) => /^\d{2}[A-ZÁÉÍÓÚÑ]{3}\s+\d{2}[A-ZÁÉÍÓÚÑ]{3}\s+/.test(line));

  for (const block of blocks) {
    const firstLine = block[0] ?? "";
    const dateMatch = firstLine.match(/^(\d{2}[A-ZÁÉÍÓÚÑ]{3})\s+(\d{2}[A-ZÁÉÍÓÚÑ]{3})\s+(.+)$/);
    if (!dateMatch || firstLine.includes("BALANCE ANTERIOR")) continue;

    const parsedDate = parsePopularDate(dateMatch[2], currentYear);
    if (!parsedDate) continue;

    const month = Number(parsedDate.slice(5, 7));
    if (periodEnd && month > Number(periodEnd.slice(5, 7))) {
      currentYear -= 1;
    }

    const trailing = dateMatch[3].match(/^(.*?)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);
    if (!trailing) continue;

    const amount = parseAmount(trailing[2]);
    const balance = parseAmount(trailing[3]);
    if (!amount || balance === null) continue;

    const descriptionLines = [trailing[1], ...block.slice(1)];
    const isDebit = trailing[2].trim().startsWith("-");

    movements.push({
      date: parsedDate,
      reference: null,
      description: normalizeSpaces(descriptionLines.join(" ")),
      debit: isDebit ? Math.abs(amount) : null,
      credit: isDebit ? null : amount,
      balance,
    });
  }

  return buildStatement({
    bankName: "Banco Popular",
    accountNumber,
    periodStart: inferPeriodStart(movements),
    periodEnd,
    openingBalance,
    closingBalance,
    movements,
    issues: [],
  });
}

function parseGenericMovementsStatement(text: string, lines: string[]): ParsedBankStatement {
  const movements: ParsedLineMovement[] = [];
  const summaryLine = lines.find((line) => /^\d{6,}\s+/.test(line));
  const accountNumber = matchFirst(text, /Número de cuenta\s+(\d+)/i) ?? summaryLine?.match(/^(\d+)/)?.[1] ?? null;
  const currentBalance = parseAmount(summaryLine?.match(/([\d,]+\.\d{2})$/)?.[1]);
  const periodMatch = text.match(/Movimientos\s+(\d{2}\/\d{2}\/\d{4})\s+-\s+(\d{2}\/\d{2}\/\d{4})/i);
  const blocks = collectBlocks(lines, (line) => DATE_DD_MM_YYYY.test(line));

  for (const block of blocks) {
    const firstLine = block[0] ?? "";
    const date = matchFirst(firstLine, DATE_DD_MM_YYYY);
    if (!date) continue;

    const dateIso = parseDdMmYyyy(date);
    if (!dateIso) continue;

    const numbers = firstLine.match(/-?[\d,]+\.\d{2}/g) ?? [];
    if (numbers.length < 2) continue;

    const balance = parseAmount(numbers[numbers.length - 1] ?? null);
    const amountRaw = numbers[numbers.length - 2] ?? null;
    const amount = parseAmount(amountRaw);
    if (!amount || balance === null) continue;

    const description = normalizeSpaces(
      [firstLine.replace(DATE_DD_MM_YYYY, ""), ...block.slice(1)]
        .join(" ")
        .replace(/-?[\d,]+\.\d{2}/g, " "),
    );
    const isDebit = amountRaw?.startsWith("-") ?? false;

    movements.push({
      date: dateIso,
      reference: null,
      description,
      debit: isDebit ? Math.abs(amount) : null,
      credit: isDebit ? null : amount,
      balance,
    });
  }

  return buildStatement({
    bankName: null,
    accountNumber,
    periodStart: periodMatch ? parseDdMmYyyy(periodMatch[1]) : inferPeriodStart(movements),
    periodEnd: periodMatch ? parseDdMmYyyy(periodMatch[2]) : inferPeriodEnd(movements),
    openingBalance: null,
    closingBalance: currentBalance,
    movements,
    issues: [],
  });
}

function buildStatement(params: {
  bankName: string | null;
  accountNumber: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  movements: ParsedLineMovement[];
  issues: string[];
}): ParsedBankStatement {
  const movements = params.movements
    .filter((movement) => movement.date && (movement.debit || movement.credit))
    .map((movement): BankStatementMovement => {
      const type = movement.credit ? "deposit" : "withdrawal";
      const amount = Math.abs(movement.credit ?? movement.debit ?? 0);
      const description = movement.description || "Movimiento bancario";
      const fingerprintSeed = [
        params.bankName,
        last4(params.accountNumber),
        movement.date,
        movement.reference,
        description,
        amount.toFixed(2),
        movement.balance?.toFixed(2) ?? "",
        type,
      ].join("|");

      return {
        source_fingerprint: stableHash(fingerprintSeed),
        external_reference: movement.reference,
        transaction_date: movement.date,
        description,
        transaction_type: type,
        amount,
        debit_amount: movement.debit,
        credit_amount: movement.credit,
        statement_balance_after: movement.balance,
        raw_payload: {
          bank_name: params.bankName,
          reference: movement.reference,
          balance_after: movement.balance,
        },
      };
    });

  const issues = [...params.issues];
  if (!params.accountNumber) {
    issues.push("No se pudo detectar el número de cuenta del estado.");
  }

  const net = movements.reduce(
    (total, movement) => total + (movement.credit_amount ?? 0) - (movement.debit_amount ?? 0),
    0,
  );
  const computedClosing =
    params.openingBalance != null
      ? Math.round((params.openingBalance + net) * 100) / 100
      : null;
  const lastRunningBalance =
    [...movements].reverse().find((movement) => movement.statement_balance_after != null)
      ?.statement_balance_after ?? null;

  // The bank's own running balance is the source of truth. The "Balance Final"
  // header is unreliable on partial/open-cycle statements (it can read 0.00),
  // so prefer the last running balance, then the opening + movements sum.
  const effectiveClosing = lastRunningBalance ?? computedClosing ?? params.closingBalance;

  if (
    params.closingBalance != null &&
    params.closingBalance !== 0 &&
    effectiveClosing != null &&
    Math.abs(params.closingBalance - effectiveClosing) >= 0.01
  ) {
    issues.push(
      "El balance final del estado no coincide con el de sus movimientos; podrían faltar movimientos por leer.",
    );
  } else if (
    computedClosing != null &&
    lastRunningBalance != null &&
    Math.abs(computedClosing - lastRunningBalance) >= 0.01
  ) {
    issues.push(
      "La suma de movimientos no cuadra con el balance corrido del estado; podrían faltar movimientos por leer.",
    );
  }

  return {
    bank_name: params.bankName,
    statement_account_number: params.accountNumber,
    statement_account_last4: last4(params.accountNumber),
    currency: "DOP",
    period_start: params.periodStart,
    period_end: params.periodEnd,
    opening_balance: params.openingBalance,
    closing_balance: effectiveClosing,
    movements,
    issues,
  };
}

function collectBlocks(lines: string[], startsBlock: (line: string) => boolean) {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (startsBlock(line)) {
      if (current.length > 0) blocks.push(current);
      current = [line];
    } else if (current.length > 0 && !isStatementChrome(line)) {
      current.push(line);
    }
  }

  if (current.length > 0) blocks.push(current);
  return blocks;
}

function isStatementChrome(line: string) {
  return /^(Pagina|Pag\s|TELEBANCO|Fecha\s+Ref\.|Movimientos$|Titular:|Número de cuenta)/i.test(line);
}

function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[$\s]/g, "").replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function parseDdMmYyyy(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parsePopularDate(value: string, year: number): string | null {
  const match = value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/^(\d{2})([A-Z]{3})$/);
  if (!match) return null;
  const month = MONTHS[match[2]];
  if (!month) return null;
  return `${year}-${String(month).padStart(2, "0")}-${match[1]}`;
}

function parsePopularHeaderDate(value: string | null): string | null {
  if (!value) return null;
  const match = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if (!match) return null;

  const monthNames: Record<string, number> = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  };

  const month = monthNames[match[2]];
  if (!month) return null;

  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function inferPeriodStart(movements: ParsedLineMovement[]) {
  return movements.map((movement) => movement.date).sort()[0] ?? null;
}

function inferPeriodEnd(movements: ParsedLineMovement[]) {
  return movements.map((movement) => movement.date).sort().at(-1) ?? null;
}

function matchFirst(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1] ?? match?.[0] ?? null;
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function last4(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `stmt_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
