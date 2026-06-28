# Discovery — friendly-error-messages

## Request

Normalize server/DB errors into clear, user-friendly Spanish messages so raw Postgres/Supabase strings stop reaching users. Provide a small reusable `mapError` util that feeds toasts and (later) the `ErrorState` from `query-error-feedback`.

## Findings

- **Actions concatenate raw DB messages into thrown errors.** Pattern across `src/actions/*.ts`: `throw new Error(\`Error al crear la cuenta por pagar: ${error.message}\`)` (e.g. `src/actions/payables.ts:36-40`, `bank-accounts.ts`, `invoices.ts`, `loyalty.ts`). ~30 such throws; `error.message` here is the raw Supabase/Postgres text (e.g. `duplicate key value violates unique constraint`, `new row violates row-level security policy`, `violates foreign key constraint`).
- **Client surfaces it verbatim.** Dialog mutations do `onError: (error) => toast.error(error?.message || "Ocurrió un error inesperado.")` — e.g. `src/app/dashboard/payables/components/new-payable-dialog.tsx:89-91`, and the same idiom in receivables/clients/invoices/settings dialogs. There are **~79 `toast.error(...)` call sites** and **~57 `error.message` interpolations** in actions.
- Some actions already throw *friendly* messages with no raw suffix (e.g. `src/actions/cuadres.ts:36-74` — "Selecciona una fecha.", Envios RD API messages; `account.ts` password errors). The util must pass these through unchanged, not double-wrap them.
- No existing error-mapping util. `src/lib/` holds `utils.ts` (cn helper) and domain libs; `src/lib/react-query.ts` configures the query client. Supabase errors are `PostgrestError` (has `.code`, `.message`, `.details`, `.hint`).
- Reference pages in scope: dashboard home, payables (`src/app/dashboard/payables/`), cuadre-del-dia (`src/app/dashboard/reports/cuadre-del-dia/`).

## Affected areas

- New: `src/lib/error-messages.ts` (the `mapError` util + a dictionary of code/substring → Spanish message).
- Wiring (reference pages this feature): the `onError`/catch paths in payables dialogs (`new-payable-dialog.tsx`, delete in `payables/page.tsx`) and cuadre-del-dia error paths; dashboard home error paths.
- The util is consumed by `query-error-feedback` (feature 4) for `ErrorState`.

## Approaches considered

- **Option A — Client-side `mapError(error)` at the presentation layer.** A pure function that inspects an `unknown`/`Error`/`PostgrestError`, matches known Postgres codes (`23505` unique, `23503` FK, `42501`/RLS), network/offline, and known substrings, returning friendly Spanish; falls back to a generic message (and passes through already-friendly action messages). Wire it into reference-page `toast.error` / error states. Leaves the 15 action files untouched. *Leaning toward this — smallest, reusable, matches reference-pages-first.*
- **Option B — Server-side normalization in actions.** Map at throw time in every action. Cleaner contract long-term but touches all ~15 action files and is a much larger blast radius — out of scope for a reference-pages-first feature.

Leaning toward: **Option A** (util now; broader rollout/Option B can be a later feature).

## Open questions ← a human must answer these

1. **Layer:** Confirm client-side `mapError` util (Option A) rather than rewriting every action now?
2. **Which conditions get specific messages?** Proposed set: unique violation ("Ya existe un registro con esos datos."), foreign-key violation ("No se puede completar: el registro está en uso."), permission/RLS ("No tienes permiso para realizar esta acción."), network/offline ("Sin conexión. Verifica tu internet e intenta de nuevo."), generic fallback ("Ocurrió un error inesperado. Intenta de nuevo."). Add/remove any?
3. **Domain-specific messages:** Should the dictionary include domain cases — NCF generation failures (`invoices.ts`), Envios RD / cuadre API failures (`cuadres.ts`) — or keep those as the action's existing friendly text (pass-through)?
4. **Pass-through detection:** OK to treat an action message that has no raw-DB markers as already-friendly and show it as-is (so we don't clobber `cuadres.ts`/`account.ts` messages)?

## Assumptions

- `mapError` is a pure, dependency-free function in `src/lib/`, returns a Spanish string, never throws.
- This feature wires the util into the **reference pages only**; app-wide rollout is a follow-up.
- No new dependencies; no change to action signatures.

## Resolution ← filled in after the human answers

- Q1 (layer) → **Client-side `mapError` util** (Option A). No action files rewritten in this feature.
- Q2 (conditions) → Default set accepted: unique violation (`23505`) → "Ya existe un registro con esos datos.", foreign-key violation (`23503`) → "No se puede completar: el registro está en uso.", permission/RLS (`42501` / RLS substring) → "No tienes permiso para realizar esta acción.", network/offline (fetch/TypeError/offline) → "Sin conexión. Verifica tu internet e intenta de nuevo.", generic fallback → "Ocurrió un error inesperado. Intenta de nuevo."
- Q3 (domain cases) → **Pass-through**: dictionary maps only generic DB/network conditions; already-friendly action messages (NCF, Envios RD/cuadre API, account/password) are shown unchanged.
- Q4 (pass-through detection) → **Yes**: an `Error` message with no raw-DB markers (no known Postgres code/substring) is treated as already-friendly and returned as-is; the generic fallback applies only when the input is non-Error/unknown or carries raw-DB markers we don't have a specific message for.
- Decision: **Option A** — pure dependency-free `src/lib/error-messages.ts` exporting `mapError(error: unknown): string`, wired into the reference pages (payables dialogs + delete, cuadre-del-dia, dashboard home) `onError`/catch paths. Reusable by `query-error-feedback`.
