# Design — breadcrumb-labels

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/dynamic-breadcrumb.tsx` | Fix broken map keys, add missing entries, normalize accents, add `isDynamicSegment` helper, update `translateSegment` to call it |

No other file is touched. No routing changes, no data fetching, no sidebar changes.

## Approach

All changes are confined to `src/components/ui/dynamic-breadcrumb.tsx`.

### 1. Add `isDynamicSegment` helper (new, before `translateSegment`)

Introduce a small pure function that returns `true` when a segment looks like a dynamic route id — either a UUID or a purely numeric string. The UUID pattern is the standard 8-4-4-4-12 hex format. The numeric check is `\d+`.

```ts
function isDynamicSegment(segment: string): boolean {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const numericPattern = /^\d+$/;
  return uuidPattern.test(segment) || numericPattern.test(segment);
}
```

### 2. Update the label map inside `translateSegment` (lines 16–42 in the current file)

Apply all changes to the `map` literal:

| Key (current) | Key (new) | Value (current) | Value (new) | Reason |
| --- | --- | --- | --- | --- |
| `"Income-types"` | `"income-types"` | `"Tipos de ingresos"` | unchanged | Bug fix: lookup lowercases the segment; capitalized key never matched |
| `"Expense-types"` | `"expense-types"` | `"Tipos de gastos"` | unchanged | Same bug |
| `"cuadre-del-dia"` | unchanged | `"Cuadre del dia"` | `"Cuadre del día"` | Accent normalization (R6) |
| `"parameters"` | unchanged | `"Parametros"` | `"Parámetros"` | Accent normalization (R7) |
| _(absent)_ | `"sync-cuadres"` | _(absent)_ | `"Sincronizar Envíos RD"` | New mapping (R3) |
| _(absent)_ | `"formulario-dgii"` | _(absent)_ | `"Formulario DGII"` | New mapping (R4) |

All other existing map entries remain unchanged. The `receivables → "CxC"` and `payables → "CxP"` entries are explicitly kept (R8).

### 3. Update the lookup inside `translateSegment` (currently lines 44–47)

Before the map lookup, check `isDynamicSegment`. If true, return `"Detalle"` immediately without consulting the map.

```ts
function translateSegment(segment: string): string {
  if (isDynamicSegment(segment)) return "Detalle";

  const map: Record<string, string> = { /* ... */ };

  return (
    map[segment.toLowerCase()] ||
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}
```

The capitalized-fallback branch (`segment.charAt(0).toUpperCase() + segment.slice(1)`) is retained unchanged for any unmapped, non-dynamic segment.

## Accent normalization note

The breadcrumb labels intentionally diverge from the sidebar (`app-sidebar.tsx`) on accents. The sidebar currently omits accents on "Parametros", "Cuadre del dia", and "Sincronizar Envios RD". The Resolution explicitly accepts this divergence: breadcrumbs use correct Spanish orthography; the sidebar is out of scope for this feature.

## Rejected alternative

**Option A — minimal map fix only (no dynamic-segment guard, no accent normalization):** rejected because the Resolution explicitly required both the UUID/numeric guard (Q2) and full accent normalization across the map (Q4). Implementing only the broken-key fixes would leave the bank-account detail breadcrumb rendering a raw UUID and would leave "Parametros" / "Cuadre del dia" without their required accents.
