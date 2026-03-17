import { format } from "date-fns";
import type { Locale } from "date-fns";

/**
 * Date utility helpers for Supabase.
 *
 * Supabase returns TIMESTAMPTZ columns as ISO 8601 strings.
 * These helpers replace all Firestore Timestamp / toMillis() patterns.
 */

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LEADING_DATE_ONLY_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:T|$)/;

export const BUSINESS_TIME_ZONE = "America/Santo_Domingo";

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function buildDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getDatePartsInTimeZone(
  date: Date,
  timeZone: string = BUSINESS_TIME_ZONE,
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

/**
 * Parse a date value that may be an ISO string, Date object, or nullish.
 * Returns a Date or null if the input is invalid.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convert a Date to an ISO string suitable for Supabase TIMESTAMPTZ columns.
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

/**
 * Get the time in milliseconds from any supported date representation.
 * Returns 0 for invalid/missing values.
 */
export function toMillis(value: string | Date | null | undefined): number {
  const d = parseDate(value);
  return d ? d.getTime() : 0;
}

/**
 * Build a UTC Date from a date string (YYYY-MM-DD format) to avoid timezone issues.
 * Used in forms that collect date-only input.
 */
export function toUTCDate(dateString: string): Date {
  const match = DATE_ONLY_PATTERN.exec(dateString);

  if (!match) {
    throw new Error(`Invalid date-only value: ${dateString}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return new Date(Date.UTC(year, month - 1, day));
}

export function dateOnlyToISOString(dateString: string): string {
  return toUTCDate(dateString).toISOString();
}

export function getTodayDateKey(timeZone: string = BUSINESS_TIME_ZONE) {
  const parts = getDatePartsInTimeZone(new Date(), timeZone);

  if (!parts) {
    throw new Error("Unable to compute today's date key.");
  }

  return buildDateKey(parts.year, parts.month, parts.day);
}

export function extractDateOnlyKey(
  value: string | Date | null | undefined,
): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    const directMatch = LEADING_DATE_ONLY_PATTERN.exec(value);
    if (directMatch) {
      return directMatch[1];
    }
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return buildDateKey(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  const parsed = parseDate(value);
  if (!parsed) return null;

  return buildDateKey(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
  );
}

export function parseDateOnly(
  value: string | Date | null | undefined,
): Date | null {
  const key = extractDateOnlyKey(value);
  if (!key) return null;

  const match = DATE_ONLY_PATTERN.exec(key);
  if (!match) return null;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

export function formatDateOnly(
  value: string | Date | null | undefined,
  dateFormat: string,
  locale?: Locale,
) {
  const date = parseDateOnly(value);
  if (!date) return null;

  return format(date, dateFormat, locale ? { locale } : undefined);
}

export function getDateOnlyMonthKey(
  value: string | Date | null | undefined,
): string | null {
  const key = extractDateOnlyKey(value);
  return key ? key.slice(0, 7) : null;
}

export function getTimestampDateKey(
  value: string | Date | null | undefined,
  timeZone: string = BUSINESS_TIME_ZONE,
): string | null {
  const date = parseDate(value);
  if (!date) return null;

  const parts = getDatePartsInTimeZone(date, timeZone);
  if (!parts) return null;

  return buildDateKey(parts.year, parts.month, parts.day);
}

export function getTimestampMonthKey(
  value: string | Date | null | undefined,
  timeZone: string = BUSINESS_TIME_ZONE,
): string | null {
  const key = getTimestampDateKey(value, timeZone);
  return key ? key.slice(0, 7) : null;
}
