/**
 * Maps thrown values (Errors, Supabase PostgrestErrors, or anything else) to a
 * user-facing Spanish string that is safe to render directly in a toast or UI.
 *
 * This module is intentionally pure and dependency-free: it never imports at
 * runtime, has no side effects at load time, and touches no browser global
 * beyond a guarded `navigator.onLine` check. The signature is kept stable so
 * future consumers (e.g. query-error-feedback) can reuse it without coupling.
 *
 * Security posture (SEC-1): this is a user-facing error boundary, so it is
 * **fail-closed** per `docs/security.md` ("Fail closed: when in doubt, reject"
 * / "never leak raw DB internals"). The R6 pass-through is the
 * security-hardened reading of "raw-DB marker": a marker is *any* evidence of
 * raw DB origin — the literal marker list, the app's own action-throw wrapper
 * prefix, or a recognizable raw-Postgres signal substring — not just the
 * original 8-item list. The R6 *intent* (genuinely friendly client messages
 * pass through) is preserved; only the leak is closed: any message that shows
 * DB origin is mapped to a specific string or collapsed to the generic
 * fallback, never returned verbatim.
 */

/** Generic fallback shown when no specific mapping applies. */
const GENERIC_MESSAGE = "Ocurrió un error inesperado. Intenta de nuevo.";

/** Network/offline message. */
const NETWORK_MESSAGE = "Sin conexión. Verifica tu internet e intenta de nuevo.";

/** Permission-denied message (Postgres 42501 / row-level-security). */
const PERMISSION_MESSAGE = "No tienes permiso para realizar esta acción.";

/**
 * Postgres error code → Spanish user message.
 * Used both for `PostgrestError.code` lookups and for raw-text suffix scanning.
 */
const CODE_MAP: Record<string, string> = {
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede completar: el registro está en uso.",
  "42501": PERMISSION_MESSAGE,
};

/**
 * Raw-DB marker substrings (lowercase). Their presence in a message means the
 * text is raw database output rather than an already-friendly action message,
 * so it must be mapped (or collapsed to generic) instead of passed through.
 *
 * Broadened for SEC-1 beyond the original constraint-violation markers to the
 * high-frequency raw-Postgres/PostgREST signals the security review named, so
 * messages like `permission denied for table payables`,
 * `invalid input syntax for type uuid: "..."`, and `numeric field overflow`
 * are recognized as raw and never echoed to the toast verbatim.
 */
const RAW_DB_MARKERS: readonly string[] = [
  // Postgres SQLSTATE codes embedded in raw text.
  "23505",
  "23503",
  "42501",
  // Constraint-violation phrasing.
  "row-level-security",
  "duplicate key",
  "foreign key",
  "violates",
  "constraint",
  // Network / fetch failures.
  "fetch",
  // Broad raw-Postgres signal substrings (SEC-1 fail-closed widening).
  "permission denied",
  "invalid input syntax",
  "numeric field overflow",
  "out of range",
  "null value in column",
  "syntax error",
  "does not exist",
];

/**
 * Matches the app's own action-throw wrapper, e.g.
 * `"Error al crear la cuenta por pagar: <raw Postgres text>"` thrown from
 * `src/actions/payables.ts`. Everything after the first `": "` is raw DB
 * output and must never be passed through (SEC-1 defense-in-depth #1).
 */
const ACTION_WRAPPER_RE = /^error al .+?: /;

/** True when `value` is a string-typed property on the candidate object. */
function hasStringProp(value: unknown, key: string): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)[key] === "string"
  );
}

/**
 * True when the lowercased message shows DB origin: a known raw-DB marker, or
 * the app's action-throw wrapper prefix. Such messages are never passed
 * through verbatim (fail-closed).
 */
function looksLikeRawDb(lowerMessage: string): boolean {
  if (ACTION_WRAPPER_RE.test(lowerMessage)) {
    return true;
  }
  return RAW_DB_MARKERS.some((marker) => lowerMessage.includes(marker));
}

/**
 * Maps a message known to carry DB origin to a specific Spanish string.
 * Returns the generic fallback when no specific mapping matches (R9 / SEC-1:
 * never echo the raw text).
 */
function mapRawMessage(lowerMessage: string): string {
  // Postgres codes embedded in the raw text (e.g. action-throw concatenations).
  for (const code of Object.keys(CODE_MAP)) {
    if (lowerMessage.includes(code)) {
      return CODE_MAP[code];
    }
  }

  // Constraint-violation keywords map to the same messages as their codes.
  if (lowerMessage.includes("duplicate key")) {
    return CODE_MAP["23505"];
  }
  if (lowerMessage.includes("foreign key")) {
    return CODE_MAP["23503"];
  }
  // Permission denials arriving as raw text (no 42501 code present).
  if (
    lowerMessage.includes("row-level-security") ||
    lowerMessage.includes("permission denied")
  ) {
    return PERMISSION_MESSAGE;
  }
  if (lowerMessage.includes("fetch")) {
    return NETWORK_MESSAGE;
  }

  // DB origin confirmed but no specific rule matched: collapse to generic so
  // the raw text never reaches the user (SEC-1 fail-closed).
  return GENERIC_MESSAGE;
}

/**
 * Maps any thrown value to a user-facing Spanish string.
 * Never throws. Returns the generic fallback for unrecognized inputs.
 *
 * @param error - The caught value (Error, PostgrestError, unknown).
 * @returns A Spanish string safe to display directly in a toast or UI.
 */
export function mapError(error: unknown): string {
  try {
    // Offline guard first: a dead network masks any error shape underneath.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return NETWORK_MESSAGE;
    }

    // PostgrestError-like: has a string `.code` and `.message`.
    if (hasStringProp(error, "code") && hasStringProp(error, "message")) {
      const code = (error as Record<string, string>).code;
      // Own-property check, not `in`: `in` walks the prototype chain and would
      // match inherited keys (`toString`, `__proto__`, …), returning a
      // non-string (SEC-2).
      if (Object.hasOwn(CODE_MAP, code)) {
        return CODE_MAP[code];
      }
      const lowerMessage = (error as Record<string, string>).message.toLowerCase();
      // A PostgrestError's `.message` is raw DB output by definition: map it if
      // we recognize it, otherwise generic — never pass it through (SEC-1).
      return mapRawMessage(lowerMessage);
    }

    // Error-like (covers TypeError from a failed fetch and action-throw text).
    if (error instanceof Error && typeof error.message === "string") {
      const lowerMessage = error.message.toLowerCase();
      if (!looksLikeRawDb(lowerMessage)) {
        // Genuinely friendly client message (e.g. a Zod/validation string):
        // pass through unchanged (R6 intent preserved).
        return error.message;
      }
      // DB origin detected (marker or action-throw wrapper): map or collapse to
      // generic — never echo the raw suffix (SEC-1 fail-closed).
      return mapRawMessage(lowerMessage);
    }

    // null, undefined, numbers, plain objects, etc.
    return GENERIC_MESSAGE;
  } catch {
    // mapError must never throw regardless of input shape (R10).
    return GENERIC_MESSAGE;
  }
}
