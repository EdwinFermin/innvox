# Discovery — dashboard-focus

> Written by the **leader** from real exploration. Centerpiece of the
> "simplificar fuerte" decision. Stays `needs_clarification` until the human
> resolves the open questions.

## Request

Make the dashboard home focused on what's actually used day-to-day. Remove
duplicated metrics, drop low-value blocks, and fix misleading trend indicators.

Human's prior signals (from brainstorm Q&A): **keep** saldos/cuentas, costos
operativos, and gráficos (flujo de caja + pulso por sucursal); **de-prioritize**
cobros/pagos; **aggressiveness = simplify hard.**

## Findings

Composition: `src/app/dashboard/page.tsx` → `home-content.tsx` mounts, in order:
1. `DashboardHero` (`dashboard-hero.tsx`)
2. `OperatingCostAlertsBanner` (`operating-cost-alerts-banner.tsx`)
3. `SectionCards` (`section-cards.tsx`) — 4 KPI cards
4. `ChartAreaInteractive` (`chart-area-interactive.tsx`) — cash-flow chart
5. `BusinessWidgets` (`business-widgets.tsx`) — 3 sub-cards

None of these are imported anywhere outside `src/components/dashboard/`, so
restructuring is fully isolated to the home. All blocks are wired to real hooks —
the problem is **redundancy and noise**, not fake data.

### Duplication inventory (the core problem)

- **`payablePending` is shown 5×:** hero "Pendiente neto" (`dashboard-hero.tsx:211`),
  hero "Presion operativa" big number (`:223`), hero "Por pagar" box (`:250`),
  SectionCards "Pagos comprometidos" (`section-cards.tsx:319`), BusinessWidgets
  "Por pagar".
- **`receivablePending` is shown 4×:** hero "Pendiente neto" (`:211`), hero "Por
  cobrar" (`:244`), SectionCards "Cobros pendientes" (`section-cards.tsx:294`),
  BusinessWidgets "Por cobrar".
- **Month flujo neto / ingresos / gastos shown 3×+:** hero "Flujo neto del mes"
  pill (`:189`) + hero Ingresos/Gastos boxes (`:198`,`:205`), SectionCards "Flujo
  neto mensual" (`section-cards.tsx:268`), and the chart's "Neto acumulado".
- **Operating-cost alerts shown 2×:** the dedicated `OperatingCostAlertsBanner`
  AND the BusinessWidgets "Pendientes y alertas" list (which merges
  receivables + payables + operating-cost alerts).

### Misleading / dead metrics

- `getVariation()` (`section-cards.tsx:41-47`) returns **0 when the previous
  month is 0**, so a brand-new metric renders a "+0%" badge with an up-trend icon
  (`:247-248`, `:273-274`) — reads as "flat" when there is actually no baseline.
- **Dead code:** `variacionCxc` and `variacionPagos` (`section-cards.tsx:228-229`)
  are computed but never rendered.

### What the human wants to keep (verbatim from Q&A)

Saldos/cuentas (hero balance), costos operativos (the banner), flujo de caja
(chart), pulso por sucursal, and actividad reciente (part of "gráficos y
análisis"). Cobros/pagos is de-prioritized.

## Affected areas

- `src/components/dashboard/home-content.tsx` — block composition/order.
- `src/components/dashboard/dashboard-hero.tsx` — trim cobros/pagos panels;
  becomes a saldos-focused hero (drops `useReceivables`/`usePayables` if those
  values leave).
- `src/components/dashboard/section-cards.tsx` — reduce/relocate KPIs; fix/remove
  trend badges; delete dead vars.
- `src/components/dashboard/business-widgets.tsx` — drop the "Pendientes y
  alertas" cobros/pagos sub-card (Q1/Q4); keep Pulso + Actividad reciente.
- `OperatingCostAlertsBanner` and `ChartAreaInteractive` — kept as-is.
- Remove now-unused hooks/imports in the trimmed components.

## Recommended target layout (to confirm)

1. **Hero — Saldos & acciones:** Balance total + cuentas activas + the month
   KPIs (Ingresos, Gastos, Flujo neto, and Facturación moved in) + CTAs. Remove
   "Pendiente neto", "Presion operativa", and the "Por cobrar/Por pagar" boxes.
2. **Costos operativos banner** — unchanged (smart-hides when empty).
3. **Flujo de caja chart** — unchanged.
4. **Pulso operativo por sucursal + Actividad reciente** — kept.

Net effect: one saldos+KPI surface (hero), one trends surface (chart), one ops
surface (costos banner), one branch+activity surface — cobros/pagos collapses
from ~9 appearances to 0–1. The open questions below decide the exact forks.

## Approaches considered

- **Option A — consolidate KPIs into the hero, drop SectionCards** (leaning
  toward): hero owns balance + month KPIs once; SectionCards block removed
  entirely. Fewest surfaces, strongest "simplificar fuerte".
- **Option B — keep a slim KPI card row:** hero = saldos only; SectionCards
  reduced to the non-duplicated KPIs (Facturación + Flujo neto), cobros/pagos
  cards removed. Two surfaces but cleaner separation.

## Open questions ← a human must answer these

1. **Cobros/pagos on the home:** remove entirely (still reachable via
   Transacciones → CxC/CxP), or keep ONE compact "Pendientes" block (cobros +
   pagos por vencer)?
2. **KPI surface:** Option A (move Facturación into the hero KPI row and drop the
   SectionCards block) or Option B (keep a slim 2-card KPI row, hero = saldos
   only)?
3. **Trend % badges:** when there's no prior-month baseline, show "Nuevo" (and
   keep the real % when a baseline exists), or drop the trend % badges entirely?
4. **BusinessWidgets:** keep "Actividad reciente" + "Pulso por sucursal" (drop
   "Pendientes y alertas"), or keep only "Pulso por sucursal"?

## Assumptions

- Defaults composing into the recommended target: Q1 → remove entirely; Q2 →
  Option A; Q3 → show "Nuevo" when no baseline; Q4 → keep Actividad reciente +
  Pulso. Override any in your answers.
- Delete dead `variacionCxc`/`variacionPagos` regardless.
- Keep the OperatingCostAlertsBanner and ChartAreaInteractive untouched.
- No data-layer/hook changes beyond removing now-unused hook calls in trimmed
  components.

## Resolution ← filled in after the human answers

- **Q1 → Remove cobros/pagos from the home entirely.** Zero appearances on the
  dashboard; still reachable via Transacciones → CxC/CxP.
- **Q2 → Option A: consolidate KPIs into the hero.** Drop the `SectionCards`
  block; the hero carries Balance + month KPIs (incl. Facturación).
- **Q3 → Show "Nuevo" when no baseline.** Keep the real % when a prior month
  exists.
- **Q4 → Keep "Actividad reciente" + "Pulso por sucursal";** drop "Pendientes y
  alertas".

### Resulting composition (`home-content.tsx`)

1. `DashboardHero` (saldos + month KPIs)
2. `OperatingCostAlertsBanner` (unchanged)
3. `ChartAreaInteractive` (unchanged)
4. `BusinessWidgets` (Actividad reciente + Pulso por sucursal only)

`SectionCards` is removed from the composition.

### DashboardHero changes (`dashboard-hero.tsx`)

- **Keep:** Balance total disponible (big number), "N cuentas activas" pill,
  "Flujo neto del mes" pill, the CTA buttons (Registrar ingreso / Ver cuentas).
- **KPI boxes row:** replace the current `Ingresos / Gastos / Pendiente neto`
  with `Facturación del mes / Ingresos / Gastos` (Facturación added via
  `useInvoices`; "Pendiente neto" removed). Flujo neto stays in the pill.
- **Trend badges (Q3):** Facturación and Flujo neto each show a variation vs. the
  previous month with this rule: `previous > 0` → signed real % (e.g. "+12.4%");
  `previous === 0 && actual > 0` → "Nuevo"; `previous === 0 && actual === 0` → no
  badge. Ingresos/Gastos boxes need no trend.
- **Remove entirely:** the "Pendiente neto" box, the "Presion operativa"
  (payables) panel, and the "Por cobrar / Por pagar" boxes. The right column
  collapses to the actions/CTA card (keep the heading/description copy or simplify
  it — implementer's call, but no cobros/pagos data).
- **Drop now-unused hooks:** `useReceivables`, `usePayables` (the hero no longer
  needs them); add `useInvoices` for Facturación. Update the combined
  loading/error gating accordingly.

### Trend helper

Move the variation logic out of the deleted `section-cards.tsx`. Implement a
small helper (in the hero file or a shared util) returning a discriminated result
so the UI can render "Nuevo" vs a signed %. Delete the dead `variacionCxc` /
`variacionPagos` along with the old file.

### SectionCards (`section-cards.tsx`)

Removed from the dashboard. Delete the component file and its import in
`home-content.tsx`. Check `dashboard-loading.tsx`: if
`DashboardKpiCardsSkeleton` becomes unused after this, remove it too; keep
`DashboardHomeLoading` (still used).

### BusinessWidgets (`business-widgets.tsx`)

- Keep "Actividad reciente" and "Pulso operativo por sucursal".
- Remove the "Pendientes y alertas" sub-card (cobros + pagos + its "Cobertura
  abierta" footer).
- Drop now-unused hooks (`useReceivables`, `usePayables`,
  `useOperatingCostAlerts`) and imports if only that sub-card used them.

- **Decision:** Multi-file dashboard restructure isolated to
  `src/components/dashboard/` (home-content, dashboard-hero, business-widgets;
  delete section-cards; tidy dashboard-loading). Banner and chart untouched. No
  data-layer changes beyond removing now-unused hook calls. Cobros/pagos collapses
  from ~9 appearances to 0; KPIs live once in the hero; trends are honest.
