# Design — empty-states

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/empty-state.tsx` | **New file.** Export `EmptyState` component. |
| `src/app/dashboard/payables/page.tsx` | Lift `NewPayableDialog` open state; split no-rows branch into two `EmptyState` renders. |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Replace two plain-text empties with `EmptyState` renders. |

## Approach

1. **Build `EmptyState`** as a pure presentational component in `src/components/ui/empty-state.tsx`. Follow the same file shape as `button.tsx` and `card.tsx`: named function export, `cn` from `@/lib/utils`, no default export. Apply Tailwind token-only classes in a centered column layout: icon wrapped in `bg-muted rounded-xl p-3` (or equivalent token), `text-foreground font-semibold` title, `text-muted-foreground text-sm` description, optional action below. Entry animation via a Tailwind CSS `@keyframes` defined inline using `animate-[...]` or via a `motion-safe:` variant on `opacity-0 translate-y-2`→`opacity-100 translate-y-0` transition classes so it works without a JS animation library.

2. **Wire payables — shared dialog state.** `NewPayableDialog` currently manages its own `open` / `setOpen` state and renders its own `<DialogTrigger>`. To expose an imperative open handle without refactoring the whole dialog, lift `open` / `setOpen` to `PayablesPage` and pass them as props `open` / `onOpenChange` to `NewPayableDialog`. The dialog component already accepts these via Radix `<Dialog open onOpenChange>`. The existing header `<NewPayableDialog />` becomes `<NewPayableDialog open={dialogOpen} onOpenChange={setDialogOpen} />`. The empty-state action is a `<Button onClick={() => setDialogOpen(true)}>Nueva cuenta por pagar</Button>`.

3. **Wire payables — two empty cases.** The existing no-rows branch (`table.getRowModel().rows?.length`) becomes two nested conditions:
   - `payables.length === 0` → empty-dataset `EmptyState` (R7).
   - `filteredPayables.length === 0` (payables non-empty but all filtered away) → no-results `EmptyState` (R8).
   Note: `payables` is the raw array from `usePayables`; `filteredPayables` is the memoized post-filter result already available in scope.

4. **Wire cuadre — two cases.** Replace the two plain-text empties in `cuadre-del-dia/page.tsx`:
   - No-branches (`!branches.length` block, lines ~200-206): render `<EmptyState icon={Building2} ... />` inside `<CardContent className="py-10">`.
   - No-movements (the `isLoading ? ... : "Sin movimientos..."` branch, lines ~258-260): render `<EmptyState icon={Inbox} ... />` inside the existing `<TableCell colSpan={5}>`. Keep the loading branch as-is (`isLoading` renders the existing text; only the else path changes).

5. **Verify.** Run `npm run typecheck` and `npm run lint` after all changes.

## Signatures / data shapes

```tsx
// src/components/ui/empty-state.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** A rendered lucide icon node or any React node placed in the icon container. */
  icon: React.ReactNode
  /** Short heading displayed below the icon. */
  title: string
  /** Supporting text displayed below the title, muted. */
  description: string
  /** Optional action element (e.g. a Button or trigger) rendered below the description. */
  action?: React.ReactNode
  /** Additional class names applied to the root wrapper. */
  className?: string
}

function EmptyState({ icon, title, description, action, className }: EmptyStateProps): React.JSX.Element
export { EmptyState }
```

```tsx
// NewPayableDialog — lifted props (added to existing interface)

interface NewPayableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// PayablesPage — new state
const [dialogOpen, setDialogOpen] = React.useState(false)
```

## Rejected alternative

**Wrap `NewPayableDialog` a second time inside the empty state as a self-contained `<NewPayableDialog />` with its own internal state** — rejected because it would create two independent dialog instances in the React tree (one in the header, one inside the table cell), each with their own form state and mutation state. This causes React to mount duplicate mutation observers and can result in two success toasts on fast double-open. Lifting a single `open` state to `PayablesPage` keeps one dialog instance in the tree and passes the open handle down to both sites, which is the idiomatic Radix / shadcn pattern for sharing controlled dialog state.
