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

const numberRegex = /RD\$\s*([0-9.,]+)/gi;

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, "").trim());
}

function parseDdMmYyyy(value: string): Date {
  const [day, month, year] = value.split("/").map((part) => Number(part));
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
  const matches = [...line.matchAll(numberRegex)];
  if (!matches.length) {
    return null;
  }

  const lastMatch = matches[matches.length - 1];
  return parseAmount(lastMatch[1]);
}

function getSubtotalFromText(text: string, lines: string[]): number | null {
  const subtotalLine = lines.find((line) => /^sub\s*total\b/i.test(line)) ?? "";
  const lineAmount = getLastAmountFromLine(subtotalLine);
  if (lineAmount !== null) {
    return lineAmount;
  }

  const compactText = text.replace(/\s+/g, " ");
  const subtotalMatch = compactText.match(
    /\bsub\s*total\b[\s\S]{0,80}?RD\$\s*([0-9.,]+)/i,
  );
  if (!subtotalMatch?.[1]) {
    return null;
  }

  return parseAmount(subtotalMatch[1]);
}

function getItbisFromText(text: string, lines: string[]): number | null {
  const itbisLine =
    lines.find((line) => /\bITBIS\b/i.test(line) && !/^\s*\d+%\s*ITBIS\s+en\s+RD\$/i.test(line)) ??
    lines.find((line) => /\bITBIS\b/i.test(line)) ??
    "";
  const lineAmount = getLastAmountFromLine(itbisLine);
  if (lineAmount !== null) {
    return lineAmount;
  }

  const compactText = text.replace(/\s+/g, " ");
  const itbisMatch = compactText.match(
    /\bITBIS\b[\s\S]{0,80}?RD\$\s*([0-9.,]+)(?:[\s\S]{0,40}?RD\$\s*([0-9.,]+))?/i,
  );
  if (!itbisMatch) {
    return null;
  }

  return parseAmount(itbisMatch[2] ?? itbisMatch[1]);
}

function getTotalFromText(text: string, lines: string[]): number | null {
  const totalLine = lines.find((line) => /^Total\b/i.test(line)) ?? "";
  const lineAmount = getLastAmountFromLine(totalLine);
  if (lineAmount !== null) {
    return lineAmount;
  }

  const compactText = text.replace(/\s+/g, " ");
  const totalMatch = compactText.match(/\bTotal\s*RD\$\s*([0-9.,]+)/i);
  if (!totalMatch?.[1]) {
    return null;
  }

  return parseAmount(totalMatch[1]);
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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rnc = text.match(/RNC\s+CLIENTE:\s*([0-9-]+)/i)?.[1] ?? "";
  const ncf =
    text.match(/\bNCF:\s*([A-Z0-9-]+)/i)?.[1] ??
    text.match(/\b([BE]\d{10,20})\b/)?.[1] ??
    "";
  const dateValue = text.match(/\bFecha:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? "";

  const subtotal = getSubtotalFromText(text, lines);
  const itbis = getItbisFromText(text, lines);
  const total = getTotalFromText(text, lines);

  const missingFields: string[] = [];
  if (!rnc) missingFields.push("RNC CLIENTE");
  if (!ncf) missingFields.push("NCF");
  if (!dateValue) missingFields.push("Fecha");
  if (subtotal === null) missingFields.push("Subtotal");
  if (itbis === null) missingFields.push("ITBIS");
  if (total === null) missingFields.push("Total");

  if (missingFields.length > 0) {
    throw new Error(`No se encontraron campos: ${missingFields.join(", ")}.`);
  }

  return {
    rnc,
    ncf,
    date: parseDdMmYyyy(dateValue),
    subtotal: subtotal!,
    itbis: itbis!,
    total: total!,
  };
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
