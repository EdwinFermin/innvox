# Requirements — breadcrumb-labels

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1 — Broken keys: income-types

WHEN the current route contains the path segment `income-types`, the system SHALL render the breadcrumb label `"Tipos de ingresos"` (not `"Income-types"` or any capitalized fallback).

## R2 — Broken keys: expense-types

WHEN the current route contains the path segment `expense-types`, the system SHALL render the breadcrumb label `"Tipos de gastos"` (not `"Expense-types"` or any capitalized fallback).

## R3 — Missing mapping: sync-cuadres

WHEN the current route contains the path segment `sync-cuadres`, the system SHALL render the breadcrumb label `"Sincronizar Envíos RD"` (not `"Sync-cuadres"` or any capitalized fallback).

## R4 — Missing mapping: formulario-dgii

WHEN the current route contains the path segment `formulario-dgii`, the system SHALL render the breadcrumb label `"Formulario DGII"` (not `"Formulario-dgii"` or any capitalized fallback).

## R5 — Dynamic id segment guard

WHEN a path segment is a UUID (matches the pattern `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` with hex characters) or is a purely numeric string, the system SHALL render the breadcrumb label `"Detalle"` instead of the raw segment value or any capitalized transformation of it.

## R6 — Accent normalization: cuadre-del-dia

WHEN the current route contains the path segment `cuadre-del-dia`, the system SHALL render the breadcrumb label `"Cuadre del día"` (with accent on `í`).

## R7 — Accent normalization: parameters

WHEN the current route contains the path segment `parameters`, the system SHALL render the breadcrumb label `"Parámetros"` (with accent on `á`).

## R8 — Compact abbreviations preserved

WHEN the current route contains the path segment `receivables`, the system SHALL render the breadcrumb label `"CxC"`. WHEN the current route contains the path segment `payables`, the system SHALL render the breadcrumb label `"CxP"`.

## R9 — No regressions on existing mappings

WHEN any path segment that was correctly mapped before this change is rendered, the system SHALL continue to render the same label it rendered before, except for labels corrected by R6 and R7.
