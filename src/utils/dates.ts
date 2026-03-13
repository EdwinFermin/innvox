/**
 * Date utility helpers for Supabase.
 *
 * Supabase returns TIMESTAMPTZ columns as ISO 8601 strings.
 * These helpers replace all Firestore Timestamp / toMillis() patterns.
 */

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
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
