# Discovery — breadcrumb-labels

> Written by the **leader** BEFORE any spec, from real exploration of this
> codebase. Stays `needs_clarification` until the human resolves the open
> questions below.

## Request

Fix the breadcrumb label map and add missing route translations so that every
`/dashboard/**` route renders a clean, human-readable trail instead of broken or
ugly fallbacks.

## Findings

Single file owns all breadcrumb labels: `src/components/ui/dynamic-breadcrumb.tsx`.

- `translateSegment()` (lines 15–48) builds a `Record<string,string>` map and
  looks up `map[segment.toLowerCase()]`, falling back to
  `segment.charAt(0).toUpperCase() + segment.slice(1)`.
- **Bug — keys never match:** the map keys `"Income-types"` (line 36) and
  `"Expense-types"` (line 37) are capitalized, but the lookup lowercases the
  segment first (`income-types`). They never hit, so the routes render
  `Income-types` / `Expense-types` instead of "Tipos de ingresos" / "Tipos de
  gastos".
- **Missing mappings** — these real routes fall back to capitalized slugs:
  - `sync-cuadres` → renders `Sync-cuadres` (sidebar label: "Sincronizar Envios
    RD", `app-sidebar.tsx:80`).
  - `formulario-dgii` → renders `Formulario-dgii` (sidebar label: "Formulario
    DGII", `app-sidebar.tsx:136`).
- **Dynamic id segment** — `/dashboard/bank-accounts/[id]` exists
  (`src/app/dashboard/bank-accounts/[id]/`). The `[id]` is a UUID, so the
  breadcrumb renders the raw capitalized UUID (e.g.
  `8F3A...`) as the final crumb. No current handling for dynamic/id segments.
- **Inconsistency with sidebar** — breadcrumb maps `receivables → "CxC"` and
  `payables → "CxP"` (lines 30–31), but the sidebar uses "Cuentas por cobrar" /
  "Cuentas por pagar" (`app-sidebar.tsx:68,72`).
- **Accent inconsistency** — both the map and the sidebar are inconsistent:
  "Configuración"/"Facturación" carry accents, but "Cuadre del dia",
  "Parametros", "Sincronizar Envios RD" do not. The sidebar is the de-facto
  source of truth and is currently accent-less for those terms.
- Collapse logic (line 59–60): trails longer than 3 segments collapse the middle
  to an ellipsis — works fine, not in scope.

## Affected areas

- `src/components/ui/dynamic-breadcrumb.tsx` — the only file. Pure label-map and
  (optionally) a small rule for dynamic id segments. No data layer, no routing
  changes.

## Approaches considered

- **Option A — minimal map fix:** lowercase the two broken keys, add
  `sync-cuadres` and `formulario-dgii`. Leaves the UUID crumb and CxC/CxP as-is.
  Smallest diff, but the bank-account detail breadcrumb stays ugly.
- **Option B — map fix + dynamic-segment rule (leaning toward):** Option A plus a
  guard that detects a dynamic id-looking segment (UUID/numeric) and renders a
  friendly label ("Detalle") instead of the raw id. Closes the last ugly case
  with a tiny, self-contained rule.
- **Option C — A/B plus normalization pass:** also align CxC/CxP to full names
  and normalize accents across all crumbs. Broader; risks diverging from the
  sidebar and touching labels nobody asked about.

Leaning toward **Option B**, with the CxC/CxP and accent questions left to the
human (Q3/Q4) so we don't normalize silently.

## Open questions ← a human must answer these

1. **New labels** — confirm wording to match the sidebar:
   `sync-cuadres → "Sincronizar Envios RD"`, `formulario-dgii → "Formulario
   DGII"`. (Alternative for sync: a shorter "Sincronizar envíos".)
2. **Dynamic id segment** (`bank-accounts/<uuid>`): render a generic friendly
   label like "Detalle", show the account name (requires a lookup — heavier), or
   leave the raw id? Recommendation: generic "Detalle".
3. **CxC/CxP**: keep the compact breadcrumb abbreviations, or align to the
   sidebar's "Cuentas por cobrar" / "Cuentas por pagar"?
4. **Accents**: keep the current accent-less style (match the sidebar as-is), or
   normalize all crumbs to proper Spanish accents (Parámetros, Cuadre del día)?
   Note: normalizing only breadcrumbs would diverge from the sidebar.

## Assumptions

- New entries match the sidebar wording verbatim (Q1 default).
- Dynamic id segments render "Detalle" (Q2 default).
- Keep CxC/CxP as compact breadcrumb labels (Q3 default).
- Keep current accent style, no normalization, to avoid diverging from the
  sidebar and scope creep (Q4 default).

## Resolution ← filled in after the human answers

- **Q1 → Match sidebar wording:** `sync-cuadres → "Sincronizar Envíos RD"`,
  `formulario-dgii → "Formulario DGII"`. (Accent on "Envíos" per Q4.)
- **Q2 → Generic "Detalle":** any dynamic id-looking segment (UUID or numeric)
  renders the literal "Detalle" instead of the raw id.
- **Q3 → Keep CxC / CxP** as compact breadcrumb labels (do not expand).
- **Q4 → Normalize accents:** all breadcrumb labels use proper Spanish accents.
  This intentionally diverges from the (accent-less) sidebar. Concrete changes:
  `"Cuadre del dia" → "Cuadre del día"`, `"Parametros" → "Parámetros"`, and the
  new `"Sincronizar Envíos RD"`. Audit every existing entry and add missing
  accents.
- **Decision (Option B + accent normalization):** In
  `src/components/ui/dynamic-breadcrumb.tsx` only —
  (a) fix the two broken keys by lowercasing them (`income-types`,
  `expense-types`);
  (b) add `sync-cuadres → "Sincronizar Envíos RD"` and `formulario-dgii →
  "Formulario DGII"`;
  (c) add a guard that maps dynamic id-looking segments (UUID/numeric) to
  "Detalle";
  (d) normalize accents across the whole map per Q4;
  (e) keep CxC/CxP.
  No data lookups, no routing changes, no other files.
