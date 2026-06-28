# Design — friendly-error-messages

## Files to touch

| File | Change |
| --- | --- |
| `src/lib/error-messages.ts` | **Create.** Pure, dependency-free module exporting `mapError(error: unknown): string`. Contains the Postgres-code dictionary, raw-DB marker detection, network-offline detection, and pass-through logic. |
| `src/app/dashboard/payables/components/new-payable-dialog.tsx` | **Edit line ~90.** Replace `toast.error(error?.message \|\| "Ocurrió un error inesperado.")` with `toast.error(mapError(error))`. Add import for `mapError`. |
| `src/app/dashboard/payables/page.tsx` | **Edit line ~206.** Replace `toast.error("Error al eliminar la cuenta")` with `toast.error(mapError(error))` inside the `deletePayable` catch block. Add import for `mapError`. |

> The cuadre-del-dia page and dashboard home page have no current `toast.error` / mutation `onError` paths to wire. They are listed in the discovery as reference pages for the broader feature set; once those pages gain error-surfacing UI (via `query-error-feedback`), `mapError` will be imported there. No changes to those files are required by this feature.

## Approach

1. Create `src/lib/error-messages.ts` with the implementation described below. No runtime imports; no side effects at module load time; no dependency on browser globals beyond a guarded `typeof navigator` check.
2. Define a `RAW_DB_MARKERS` constant — an array of lowercase substrings (`"23505"`, `"23503"`, `"42501"`, `"row-level-security"`, `"duplicate key"`, `"foreign key"`, `"violates"`, `"fetch"`) used to distinguish already-friendly messages from raw-DB text.
3. Define a `CODE_MAP` record mapping known Postgres codes to their Spanish strings.
4. `mapError` inspects the input in this order:
   a. Wrap the entire body in `try/catch`; return the generic fallback if an internal exception escapes.
   b. Check `navigator.onLine === false` (guarded by `typeof navigator !== "undefined"`) → network message.
   c. If the input looks like a `PostgrestError` (has `.code` and `.message` as strings): look up `.code` in `CODE_MAP`; if found return mapped string; if `.message` contains any raw-DB marker and no code mapping, return generic fallback.
   d. If the input is an `Error`: test whether `.message` contains a raw-DB marker. If no marker → pass-through (return `.message` as-is). If marker present → scan `CODE_MAP` keys for a matching code substring, then check for `"row-level-security"` → permission message, then `"fetch"` → network message; otherwise generic fallback.
   e. Everything else → generic fallback.
5. Wire the import and call-site replacement in the two payables files.

## Signatures / data shapes

```typescript
// src/lib/error-messages.ts

/** Raw-DB marker substrings (lowercase). Used to detect non-friendly messages. */
const RAW_DB_MARKERS: readonly string[];

/** Postgres error code → Spanish user message. */
const CODE_MAP: Record<string, string>;

/**
 * Maps any thrown value to a user-facing Spanish string.
 * Never throws. Returns generic fallback for unrecognized inputs.
 *
 * @param error - The caught value (Error, PostgrestError, unknown).
 * @returns A Spanish string safe to display directly in a toast or UI.
 */
export function mapError(error: unknown): string;
```

The function has no other exports. The module has no side effects.

## Rejected alternative

**Server-side normalization in action files (Option B)** — rejected because it requires touching all ~15 `src/actions/*.ts` files, each with its own domain context, expanding the blast radius well beyond a reference-pages-first rollout. It also pushes presentation concerns (Spanish UI copy) into the server action layer. A client-side util is smaller, independently testable, and reusable without coupling the action signatures to display logic.
