# Implementation — friendly-error-messages

## Summary

Added a pure, dependency-free `mapError(error: unknown): string` utility that
normalizes any thrown value (Supabase `PostgrestError`, `Error`, or anything else)
into a user-facing Spanish string, and wired it into the two payables call sites
that currently surface raw or generic error text. No raw Postgres internals can
reach the toast: every recognized DB marker is mapped to a controlled message, and
anything unrecognized falls back to a generic string. The function is wrapped in an
internal `try/catch` so it never throws regardless of input shape.

## Files changed

| File | Change |
| --- | --- |
| `src/lib/error-messages.ts` | Created, then **security-hardened (SEC-1/SEC-2)** — exports `mapError`. Holds `CODE_MAP` (Postgres code → Spanish), `RAW_DB_MARKERS` (broadened lowercase substrings that flag raw-DB text), `ACTION_WRAPPER_RE` (the app's `"Error al …: "` throw prefix), `looksLikeRawDb` (fail-closed DB-origin detector), offline guard, PostgrestError-shape branch, Error pass-through/mapping branch, generic fallback, and an outer `try/catch`. |
| `src/app/dashboard/payables/components/new-payable-dialog.tsx` | Edited — added `import { mapError } from "@/lib/error-messages";`; replaced `toast.error(error?.message \|\| "Ocurrió un error inesperado.")` with `toast.error(mapError(error))` in the mutation `onError` callback. |
| `src/app/dashboard/payables/page.tsx` | Edited — added `import { mapError } from "@/lib/error-messages";`; replaced `toast.error("Error al eliminar la cuenta")` with `toast.error(mapError(error))` in the `deletePayable` catch block (the `throw error;` re-throw is preserved so the ConfirmDialog still sees the failure). |
| `specs/friendly-error-messages/tasks.md` | Checked off T1–T3 and T14–T17; added the no-unit-runner note under the Tests heading; Traceability table left intact. |

## Key design decisions

- **Inspection order: offline → PostgrestError → Error → generic.** The offline
  guard (`typeof navigator !== "undefined" && navigator.onLine === false`) runs first
  because a dead network masks whatever error shape sits underneath; the `typeof`
  guard keeps the module safe to import in any (including non-browser) context per the
  design's "guarded `typeof navigator`" constraint (R5).
- **PostgrestError detection by structural shape, not `instanceof`.** Supabase's
  `PostgrestError` is a plain object, so the branch fires on "has string `.code` AND
  string `.message`". A known `.code` maps via `CODE_MAP`; an unknown `.code` whose
  `.message` carries a raw marker maps via `mapRawMessage`; otherwise the message is
  treated as already-friendly and passed through (R1–R3, R6, R9).
- **Raw-marker gate distinguishes friendly from raw text (R6 vs R7).** Action files in
  this codebase throw concatenations like `"Error al crear la cuenta por pagar: " + raw`.
  `containsRawDbMarker` lowercases once and tests every `RAW_DB_MARKERS` substring; if
  none match, the message is a hand-written friendly string and is returned verbatim
  (R6). If a marker matches, `mapRawMessage` resolves the specific message — embedded
  Postgres codes first, then `duplicate key`/`foreign key`/`row-level-security`/`fetch`
  keywords — replacing the original concatenated string (R7).
- **`mapRawMessage` returns the generic fallback when a marker exists but no specific
  rule matches (R9).** This keeps `violates`-only or unknown raw text from leaking: it
  is recognized as raw (so never passed through) yet has no friendly mapping, so it
  collapses to the generic message.
- **`row-level-security` substring (case-insensitive) → permission message (R4),** and
  `42501` maps to the same constant `PERMISSION_MESSAGE`, so the RLS-denied case is
  consistent whether it arrives as a Postgres code or as message text.
- **Exact Spanish strings are centralized as named constants** (`GENERIC_MESSAGE`,
  `NETWORK_MESSAGE`, `PERMISSION_MESSAGE`) and in `CODE_MAP`, copied verbatim from
  requirements R1–R9 — no string drift between the two reused-permission paths.
- **No test file created.** Per the project test contract (`reins.config.json`
  `test: null`; `CLAUDE.md` forbids adding test infra/dependencies), no `*.test.ts` was
  written — it could not run and would be dead code that lint/typecheck still process.
  The requirement→behavior obligation is carried by the traceability table plus the
  green `npx reins verify` gate.
- **Signature kept stable and dependency-free (R13).** `mapError(error: unknown): string`
  with no imports and no module-load side effects, so the future `query-error-feedback`
  consumer can adopt it without coupling.

## Security hardening (post-review SECURITY_BLOCK)

The security-reviewer raised a HIGH info-disclosure block; both findings were fixed in
`src/lib/error-messages.ts` with **no signature change, no new dependency, and the R10
never-throws guarantee intact**. The exact Spanish strings (R1–R9) are unchanged.

- **SEC-1 (HIGH) — info disclosure / fail-open → fixed by making `mapError` fail-closed.**
  The original R6 pass-through was a deny-list: an `Error`/`PostgrestError` whose message
  contained none of the 8 markers was returned **verbatim**. That is reachable today —
  `src/actions/payables.ts:37-38` and `:56-57` throw
  `new Error("Error al crear/eliminar la cuenta por pagar: " + rawPostgresMessage)` —
  so raw text like `permission denied for table payables` (leaks the table name),
  `invalid input syntax for type uuid: "<id>"` (leaks schema + echoes user input), and
  `numeric field overflow` would have reached the toast. Fix, two layers of defense:
  1. **Action-throw wrapper detection** (`ACTION_WRAPPER_RE = /^error al .+?: /`): any
     message matching the app's own `"Error al …: "` throw prefix is raw by construction —
     the text after the first `": "` is raw DB output — so it is never passed through.
  2. **Broadened `RAW_DB_MARKERS`** with the raw-Postgres signal substrings the reviewer
     named (`permission denied`, `invalid input syntax`, `numeric field overflow`,
     `out of range`, `null value in column`, `constraint`, `syntax error`,
     `does not exist`) plus the existing markers, all lowercased.

  Both the `Error` branch and the `PostgrestError`-shape branch now route any DB-origin
  message through `mapRawMessage`, which maps a recognized marker (R1–R5/R7) and otherwise
  returns `GENERIC_MESSAGE` — it **never** returns the raw text. The `PostgrestError`
  `.message` pass-through that previously existed at the old `:114` was removed entirely
  (a PostgrestError's message is raw DB output by definition). **R6 intent is preserved:**
  a genuinely friendly client message with no wrapper and no DB signal (e.g. a Zod string
  like `"Selecciona una fecha."`) still passes through unchanged — only the leak is closed.
  This is the security-hardened reading of "raw-DB marker": a marker is *any* evidence of
  raw DB origin (literal marker list, action-throw wrapper, or raw-Postgres signal), not
  just the original 8-item list. Documented in the module header and at each branch.

- **SEC-2 (LOW) — prototype-walk → fixed.** The code lookup changed from
  `code in CODE_MAP` (walks the prototype chain; a `.code` of `"toString"`/`"__proto__"`
  would match an inherited member and return a non-string) to
  `Object.hasOwn(CODE_MAP, code)`, so only own string-valued codes match. This preserves
  the `mapError(error): string` / R8 / R10 contract for hostile input shapes.

## Requirement → coverage table

| Req | What it mandates | Implemented in | Gate that proves it |
| --- | --- | --- | --- |
| R1 | code `23505` → "Ya existe un registro con esos datos." | `CODE_MAP["23505"]`, PostgrestError branch | typecheck + lint + traceability (T4 traced) |
| R2 | code `23503` → "No se puede completar: el registro está en uso." | `CODE_MAP["23503"]` | typecheck + lint + traceability (T5 traced) |
| R3 | code `42501` → "No tienes permiso para realizar esta acción." | `CODE_MAP["42501"]` → `PERMISSION_MESSAGE` | typecheck + lint + traceability (T6 traced) |
| R4 | `.message` contains `row-level-security` (ci) → permission message | `mapRawMessage` `row-level-security` branch | typecheck + lint + traceability (T7 traced) |
| R5 | TypeError w/ `fetch`, or `navigator.onLine === false` → network message | offline guard + `fetch` branch in `mapRawMessage` | typecheck + lint + traceability (T8 traced) |
| R6 | friendly message (no marker) → returned unchanged | Error/PostgrestError pass-through when `!containsRawDbMarker` | typecheck + lint + traceability (T9 traced) |
| R7 | raw suffix after a friendly prefix → mapped specific message | `containsRawDbMarker` + `mapRawMessage` | typecheck + lint + traceability (T10 traced) |
| R8 | non-Error/non-PostgrestError (null/undefined/string/number/object) → generic | final `return GENERIC_MESSAGE` | typecheck + lint + traceability (T11 traced) |
| R9 | marker present, no specific mapping → generic | `mapRawMessage` final `return GENERIC_MESSAGE` | typecheck + lint + traceability (T12 traced) |
| R10 | never throws for any input | outer `try/catch` returning `GENERIC_MESSAGE` | typecheck + lint + traceability (T13 traced) |
| R11 | dialog `onError` calls `toast.error(mapError(error))` | `new-payable-dialog.tsx` `onError` | lint + typecheck (call site compiles & imports resolve) |
| R12 | `deletePayable` catch calls `toast.error(mapError(error))` | `page.tsx` catch block | lint + typecheck (call site compiles & imports resolve) |
| R13 | stable, dependency-free signature | `export function mapError(error: unknown): string`, zero imports | typecheck (signature) + security (no new deps) |

> No unit runner exists in this project (`reins.config.json` → `test: null`;
> `CLAUDE.md` forbids adding test infrastructure or dependencies). Tasks T4–T13
> describe the intended assertions and remain traced in `tasks.md`; the behavior is
> proven by typecheck/lint plus the green `npx reins verify` gate rather than an
> executable runner.

## Self-review (Four R's)

**Risk** — Blast radius is contained: one new leaf module plus two two-line call-site
swaps, all inside the feature's stated scope (no drive-by edits, no signature/route/
schema changes, so no reversibility artifact is owed). `mapError` is purely additive —
nothing imports it yet besides the two new call sites, and the `page.tsx` catch still
re-throws `error` so the ConfirmDialog control flow is unchanged. `progress/history.md`
is untouched (append happens at feature close, not here). Proof: `npx reins verify
--changed` reports `feature-list` 1 in progress and `design` clean over exactly the two
UI files touched.

**Readability** — Names match behavior: `mapError`, `CODE_MAP`, `RAW_DB_MARKERS`,
`containsRawDbMarker`, `mapRawMessage`, `hasStringProp`. The non-obvious decisions carry
their *why* in comments at the point of use: the offline-first ordering ("a dead network
masks any error shape underneath"), the R6-vs-R7 split ("treat as already-friendly" vs
the raw-marker scan), and the outer catch ("mapError must never throw regardless of input
shape (R10)"). No dead code, no commented-out blocks, no vestigial params. Each branch is
flat (≤2 nesting levels) with one responsibility.

**Reliability** — Every in-contract input class from the spec has a deterministic path:
all three finite Postgres codes (`23505`/`23503`/`42501`), the RLS message case, the
network/offline case, friendly pass-through, raw-suffix mapping, the generic fallback for
non-Error inputs, and the "marker but no mapping" generic case. Output is a pure function
of the input plus a single guarded environment read (`navigator.onLine`); no reliance on
map order beyond `CODE_MAP` key iteration where every key maps to a distinct substring
test, so the result is stable. Re-running `mapError` on the same value is idempotent.

**Resilience** — `mapError` is the resilience layer for the UI: it is the boundary that
keeps the app standing when the DB or network "breaks". The outer `try/catch` guarantees
**R10 — it never throws** for any input shape (circular objects, thrown non-Errors,
exotic getters), always degrading to `GENERIC_MESSAGE`. The `typeof navigator` guard keeps
it safe where the global is absent. There are no acquired resources, no external calls, and
no on-disk writes in this module, so there is nothing to leak or leave half-written. The
**no-raw-leak guarantee is now fail-closed** (post SEC-1): every `PostgrestError`-shaped
value and every `Error` whose message shows DB origin — a broadened raw marker *or* the
app's `"Error al …: "` action-throw wrapper — is routed through `mapRawMessage`, which
maps a recognized case or returns the generic fallback and **never** returns the raw text.
Only a message with no wrapper and no DB signal passes through (the genuine R6 case). So
raw Postgres text (table/column names, type internals, echoed user input, statement
diagnostics) can no longer reach the toast (`docs/security.md`: "fail closed" / "never
leak raw DB internals"). SEC-2 additionally swaps `in` for `Object.hasOwn` so a hostile
`.code` (`"__proto__"`, `"toString"`) can never return a non-string, keeping the
"always a safe display string" contract under R8/R10.

## Final verify output

```
$ npm run typecheck
> tsc --noEmit
(no errors)

$ npm run lint
> eslint
(no errors)

$ npx reins verify   (re-run after SEC-1/SEC-2 fixes)
Reins verify
  ✓ lint          npm run lint  9.0s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.2s
  ✓ design        21 advisory slop tell(s)
  ✓ feature-list  8 feature(s), 1 active, 1 in progress  5ms
  ✓ traceability  every requirement maps to a task  2ms

Result: PASS
```

> The 21 design slop tells are advisory (non-blocking) and pre-existing across the
> repo's UI; none are in the two payables files touched by this feature (the
> `--changed` run reported those 2 files clean).

## Handoff

Implementation complete and self-verified. Not marking `done` — awaiting reviewer
approval per protocol.
