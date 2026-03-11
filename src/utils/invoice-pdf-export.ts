import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export interface ParsedInvoiceExportData {
  rnc: string;
  ncf: string;
  date: Date;
  subtotal: number;
  itbis: number;
  total: number;
}

type InvoiceLayout = "legacy" | "credit-fiscal";

const currencyAmountRegex = /(?:RD\$\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/gi;

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDdMmYyyy(value: string): Date {
  const normalizedValue = value.replace(/[.-]/g, "/").trim();
  const [day, month, year] = normalizedValue.split("/").map((part) => Number(part));
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`Fecha invalida: ${value}`);
  }

  return date;
}

function getLastAmountFromLine(line: string): number | null {
  const matches = [...line.matchAll(currencyAmountRegex)];
  if (!matches.length) {
    return null;
  }

  const lastMatch = matches[matches.length - 1];
  return parseAmount(lastMatch[1]);
}

function getFirstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim();
    if (match) {
      return match;
    }
  }

  return "";
}

function getDateMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim();
    if (match) {
      return match;
    }
  }

  return "";
}

function getFirstLines(text: string, count: number): string {
  return text
    .split(/\r?\n/)
    .slice(0, count)
    .join("\n");
}

function getLabeledAmountFromLine(lines: string[], patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const matchingLines = lines.filter((candidate) => pattern.test(candidate));
    if (!matchingLines.length) continue;

    for (const line of [...matchingLines].reverse()) {
      const amount = getLastAmountFromLine(line);
      if (amount !== null) {
        return amount;
      }
    }
  }

  return null;
}

function getLabeledAmountFromText(text: string, patterns: RegExp[]): number | null {
  const compactText = text.replace(/\s+/g, " ");

  for (const pattern of patterns) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    const matches = [...compactText.matchAll(globalPattern)];
    const lastMatch = matches.at(-1);
    if (lastMatch?.[1]) {
      return parseAmount(lastMatch[1]);
    }
  }

  return null;
}

function detectInvoiceLayout(text: string): InvoiceLayout {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("fecha de emisión") ||
    normalized.includes("fecha de emision") ||
    normalized.includes("razon social cliente") ||
    normalized.includes("conduce no.")
  ) {
    return "legacy";
  }

  if (
    normalized.includes("para crédito fiscal") ||
    normalized.includes("para credito fiscal") ||
    normalized.includes("válida hasta") ||
    normalized.includes("valida hasta") ||
    normalized.includes("18% itbis en rd$") ||
    normalized.includes("no. factura")
  ) {
    return "credit-fiscal";
  }

  return "legacy";
}

function parseLegacyInvoice(text: string, lines: string[]): ParsedInvoiceExportData {
  const headerText = getFirstLines(text, 25);
  const rnc = getFirstMatch(`${headerText}\n${text}`, [
    /(?:^|\n)\s*([0-9-]{8,})\s*(?:\n|$)/i,
    /\bR\s*N\s*C\b(?!\s*CLIENTE)\s*:?\s*([0-9-]+)/i,
  ]);
  const ncf = getFirstMatch(`${headerText}\n${text}`, [
    /\bN\s*C\s*F\s*:?\s*([A-Z0-9-]+)/i,
    /\bN\s*C\s*F\b[^A-Z0-9]{0,10}([SBE]\d{10,20})\b/i,
    /\b([SBE]\d{10,20})\b/i,
  ]);
  const dateValue = getDateMatch(text, [
    /\bFecha\s+de\s+Emisi[oó]n\s+([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})/i,
    /\bFecha\s*:?\s*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})/i,
  ]);

  const subtotal =
    getLabeledAmountFromLine(lines, [/^sub\s*total\b/i, /^subtotal\b/i]) ??
    getLabeledAmountFromText(text, [
      /\bsub\s*total\b[^0-9]{0,20}([0-9.,]+)/i,
      /\bsubtotal\b[^0-9]{0,20}([0-9.,]+)/i,
    ]);
  const itbis =
    getLabeledAmountFromLine(lines, [/\bITBIS\b/i]) ??
    getLabeledAmountFromText(text, [
      /\bITBIS\b[^0-9]{0,20}([0-9.,]+)/i,
    ]);
  const total =
    getLabeledAmountFromLine(lines, [/^total\b/i]) ??
    getLabeledAmountFromText(text, [
      /\btotal\b[^0-9]{0,20}([0-9.,]+)/i,
    ]);

  return normalizeParsedInvoice({ rnc, ncf, dateValue, subtotal, itbis, total });
}

function parseCreditFiscalInvoice(text: string, lines: string[]): ParsedInvoiceExportData {
  const headerText = getFirstLines(text, 25);
  const rnc = getFirstMatch(`${headerText}\n${text}`, [
    /\bR\s*N\s*C\b(?!\s*CLIENTE)\s*:?\s*([0-9-]+)/i,
  ]);
  const ncf = getFirstMatch(`${headerText}\n${text}`, [
    /\bN\s*C\s*F\s*:?\s*([A-Z0-9-]+)/i,
    /\bN\s*C\s*F\b[^A-Z0-9]{0,10}([SBE]\d{10,20})\b/i,
    /\b([SBE]\d{10,20})\b/i,
  ]);
  const dateValue = getDateMatch(text, [
    /\bFecha\s*:\s*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})/i,
    /\bVENCIMIENTO\s*:\s*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})/i,
  ]);

  const subtotal =
    getLabeledAmountFromLine(lines, [/^subtotal\b/i]) ??
    getLabeledAmountFromText(text, [/\bsubtotal\b[^0-9]{0,20}(?:RD\$\s*)?([0-9.,]+)/i]);
  const itbis =
    getLabeledAmountFromLine(lines, [/18%\s*ITBIS/i, /\bITBIS\b/i]) ??
    getLabeledAmountFromText(text, [
      /18%\s*ITBIS(?:\s+en\s+RD\$\s*[0-9.,]+)?[^0-9]{0,20}(?:RD\$\s*)?([0-9.,]+)/i,
      /\bITBIS\b[^0-9]{0,20}(?:RD\$\s*)?([0-9.,]+)/i,
    ]);
  const total =
    getLabeledAmountFromLine(lines, [/^total\b/i]) ??
    getLabeledAmountFromText(text, [/\btotal\b[^0-9]{0,20}(?:RD\$\s*)?([0-9.,]+)/i]);

  return normalizeParsedInvoice({ rnc, ncf, dateValue, subtotal, itbis, total });
}

function normalizeParsedInvoice({
  rnc,
  ncf,
  dateValue,
  subtotal,
  itbis,
  total,
}: {
  rnc: string;
  ncf: string;
  dateValue: string;
  subtotal: number | null;
  itbis: number | null;
  total: number | null;
}): ParsedInvoiceExportData {
  const normalizedTotal =
    subtotal !== null &&
    itbis !== null &&
    (total === null || Math.abs(total - subtotal) < 0.01)
      ? roundCurrency(subtotal + itbis)
      : total;

  const missingFields: string[] = [];
  if (!rnc) missingFields.push("RNC");
  if (!ncf) missingFields.push("NCF");
  if (!dateValue) missingFields.push("Fecha");
  if (subtotal === null) missingFields.push("Subtotal");
  if (itbis === null) missingFields.push("ITBIS");
  if (normalizedTotal === null) missingFields.push("Total");

  if (missingFields.length > 0) {
    throw new Error(`No se encontraron campos: ${missingFields.join(", ")}.`);
  }

  return {
    rnc,
    ncf,
    date: parseDdMmYyyy(dateValue),
    subtotal: subtotal!,
    itbis: itbis!,
    total: normalizedTotal!,
  };
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = "";

    for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
      const value = item.str?.trim();
      if (value) {
        currentLine += currentLine ? ` ${value}` : value;
      }

      if (item.hasEOL && currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    pages.push(lines.join("\n"));
  }

  return pages.join("\n");
}

export async function parseInvoicePdf(
  file: File,
): Promise<ParsedInvoiceExportData> {
  const text = await extractPdfText(file);
  if (!text.trim()) {
    throw new Error("El PDF no contiene texto seleccionable.");
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const layout = detectInvoiceLayout(text);

  if (layout === "credit-fiscal") {
    return parseCreditFiscalInvoice(text, lines);
  }

  return parseLegacyInvoice(text, lines);
}

export function toExcelSerial(date: Date): number {
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const excelEpoch = Date.UTC(1899, 11, 30);
  return Math.floor((utcDate - excelEpoch) / 86_400_000);
}

export function getSpanishMonthName(date: Date): string {
  const month = new Intl.DateTimeFormat("es-DO", { month: "long" }).format(date);
  return month.charAt(0).toUpperCase() + month.slice(1);
}
