# Requirements — friendly-error-messages

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1

WHEN `mapError` is called with a `PostgrestError` whose `.code` is `"23505"`, the system SHALL return the string `"Ya existe un registro con esos datos."`.

## R2

WHEN `mapError` is called with a `PostgrestError` whose `.code` is `"23503"`, the system SHALL return the string `"No se puede completar: el registro está en uso."`.

## R3

WHEN `mapError` is called with a `PostgrestError` whose `.code` is `"42501"`, the system SHALL return the string `"No tienes permiso para realizar esta acción."`.

## R4

WHEN `mapError` is called with an `Error` whose `.message` contains the substring `"row-level-security"` (case-insensitive), the system SHALL return the string `"No tienes permiso para realizar esta acción."`.

## R5

WHEN `mapError` is called and the error signals a network failure — specifically a `TypeError` with message containing `"fetch"`, or `navigator.onLine` is `false` — the system SHALL return the string `"Sin conexión. Verifica tu internet e intenta de nuevo."`.

## R6

WHEN `mapError` is called with an `Error` whose `.message` contains no raw-DB marker (none of the known Postgres codes `23505`, `23503`, `42501`, nor the substrings `"row-level-security"`, `"duplicate key"`, `"foreign key"`, `"violates"`, `"fetch"`), the system SHALL return that `.message` unchanged (pass-through for already-friendly action messages).

## R7

WHEN `mapError` is called with an `Error` whose `.message` contains a raw-DB marker suffix (e.g., a prefix like `"Error al crear la cuenta por pagar: "` followed by raw Postgres text), the system SHALL detect the raw suffix, map it to the appropriate specific message from R1–R5, and return that mapped message instead of the original string.

## R8

WHEN `mapError` is called with any input that is not an `Error` or `PostgrestError` (including `null`, `undefined`, a plain string, or an unrecognized object), the system SHALL return the string `"Ocurrió un error inesperado. Intenta de nuevo."`.

## R9

WHEN `mapError` is called with an `Error` that carries a raw-DB marker for which no specific mapping exists (none of R1–R5 applies), the system SHALL return the string `"Ocurrió un error inesperado. Intenta de nuevo."`.

## R10

WHILE `mapError` executes, the system SHALL never throw an exception, regardless of the shape of its input.

## R11

WHEN a mutation `onError` callback fires in `src/app/dashboard/payables/components/new-payable-dialog.tsx`, the system SHALL call `toast.error(mapError(error))` rather than `toast.error(error?.message || "Ocurrió un error inesperado.")`.

## R12

WHEN the `deletePayable` catch block fires in `src/app/dashboard/payables/page.tsx`, the system SHALL call `toast.error(mapError(error))` rather than the hardcoded string `"Error al eliminar la cuenta"`.

## R13

IF `mapError` is imported by a future consumer (such as the `query-error-feedback` feature), the function signature `mapError(error: unknown): string` SHALL remain stable and require no new dependencies.
