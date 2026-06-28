# Tasks — friendly-error-messages

> Discrete tasks that together cover every requirement. Check each off when done.

## Implementation

- [x] T1 — Create `src/lib/error-messages.ts`: define `RAW_DB_MARKERS`, `CODE_MAP`, and export `mapError(error: unknown): string` with the full inspection logic (Postgres-code lookup, raw-marker detection, pass-through, network-offline guard, internal try/catch) (covers: R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R13)
- [x] T2 — Edit `src/app/dashboard/payables/components/new-payable-dialog.tsx`: import `mapError` from `@/lib/error-messages`; replace `toast.error(error?.message || "Ocurrió un error inesperado.")` with `toast.error(mapError(error))` in the mutation `onError` callback (covers: R11)
- [x] T3 — Edit `src/app/dashboard/payables/page.tsx`: import `mapError` from `@/lib/error-messages`; replace `toast.error("Error al eliminar la cuenta")` with `toast.error(mapError(error))` in the `deletePayable` catch block (covers: R12)

## Tests

> No unit runner in this project (reins.config test:null; CLAUDE.md forbids adding test infra). These requirements are traced via the table above and verified by the green `npx reins verify` gate.

- [ ] T4 — Unit test `src/lib/error-messages.test.ts`: assert `mapError` returns `"Ya existe un registro con esos datos."` for a PostgrestError with code `"23505"` (covers: R1)
- [ ] T5 — Unit test: assert `mapError` returns `"No se puede completar: el registro está en uso."` for a PostgrestError with code `"23503"` (covers: R2)
- [ ] T6 — Unit test: assert `mapError` returns `"No tienes permiso para realizar esta acción."` for a PostgrestError with code `"42501"` (covers: R3)
- [ ] T7 — Unit test: assert `mapError` returns `"No tienes permiso para realizar esta acción."` for an `Error` whose message contains `"row-level-security"` (covers: R4)
- [ ] T8 — Unit test: assert `mapError` returns `"Sin conexión. Verifica tu internet e intenta de nuevo."` for a `TypeError` whose message contains `"fetch"` (covers: R5)
- [ ] T9 — Unit test: assert `mapError` returns the original message unchanged for an `Error` with a fully friendly message (no raw-DB markers, e.g., `"Selecciona una fecha."`) (covers: R6)
- [ ] T10 — Unit test: assert `mapError` returns the specific mapped message (not the original concatenated string) for an `Error` whose message matches the action-throw pattern `"Error al crear la cuenta por pagar: duplicate key value violates unique constraint"` (covers: R7)
- [ ] T11 — Unit test: assert `mapError` returns `"Ocurrió un error inesperado. Intenta de nuevo."` for `null`, `undefined`, a bare number, and a plain object (covers: R8)
- [ ] T12 — Unit test: assert `mapError` returns `"Ocurrió un error inesperado. Intenta de nuevo."` for an `Error` with a raw-DB marker that does not match any specific code mapping (covers: R9)
- [ ] T13 — Unit test: assert `mapError` does not throw when called with `undefined`, `null`, a circular-reference object, or a thrown non-Error value (covers: R10)

## Close

- [x] T14 — Run `npm run typecheck` and confirm zero new type errors
- [x] T15 — Run `npm run lint` and confirm zero new lint errors
- [x] T16 — `npx reins verify` is green
- [x] T17 — Traceability table written into `progress/impl_friendly-error-messages.md`

## Traceability

| Requirement | Task(s) | Test(s) |
| --- | --- | --- |
| R1 | T1 | T4 |
| R2 | T1 | T5 |
| R3 | T1 | T6 |
| R4 | T1 | T7 |
| R5 | T1 | T8 |
| R6 | T1 | T9 |
| R7 | T1 | T10 |
| R8 | T1 | T11 |
| R9 | T1 | T12 |
| R10 | T1 | T13 |
| R11 | T2 | T4, T7, T9 |
| R12 | T3 | T4, T7, T9 |
| R13 | T1 | T4–T13 |
