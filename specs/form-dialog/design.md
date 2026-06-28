# Design — form-dialog

> Pure refactor. No new routes, no new actions, no schema changes.
> This is a large refactor touching 23 files (1 new + 22 edits); tasks are
> structured so each dialog can be checked and committed independently.

---

## Files to touch

| File | Change |
| --- | --- |
| `src/components/ui/form-dialog.tsx` | **Create** — the shared `<FormDialog>` shell |
| `src/app/dashboard/payables/components/new-payable-dialog.tsx` | Retrofit to `<FormDialog>` |
| `src/app/dashboard/branches/components/new-branch-dialog.tsx` | Retrofit to `<FormDialog>` |
| `src/app/dashboard/clients/components/new-client-dialog.tsx` | Retrofit to `<FormDialog>` |
| `src/app/dashboard/receivables/components/new-receivable-dialog.tsx` | Retrofit to `<FormDialog>` |
| `src/app/dashboard/users/components/new-user-dialog.tsx` | Retrofit to `<FormDialog>` |
| `src/app/dashboard/users/components/edit-user-dialog.tsx` | Retrofit; computed title/submitLabel |
| `src/app/dashboard/bank-accounts/components/new-bank-account-dialog.tsx` | Retrofit; `DialogClose`-cancel via default footer equivalent |
| `src/app/dashboard/transactions/expenses/components/new-expense-dialog.tsx` | Retrofit; `headerExtra` for receipt-upload; computed title/submitLabel |
| `src/app/dashboard/transactions/incomes/components/new-income-dialog.tsx` | Retrofit; computed title/submitLabel |
| `src/app/dashboard/invoices/components/new-invoice-dialog.tsx` | Retrofit; computed title/submitLabel |
| `src/app/dashboard/costos-operativos/components/new-operating-cost-dialog.tsx` | Retrofit; computed title/submitLabel |
| `src/app/dashboard/link-de-pago/components/new-link-payment-dialog.tsx` | Retrofit to `<FormDialog>` |
| `src/app/dashboard/branches/components/branch-sync-settings-dialog.tsx` | Retrofit; `canSubmit={isDirty}` |
| `src/app/dashboard/parameters/expense-types/components/new-expense-type-dialog.tsx` | Normalize onto `<FormDialog>`; add description |
| `src/app/dashboard/parameters/income-types/components/new-income-type-dialog.tsx` | Normalize onto `<FormDialog>`; add description |
| `src/app/dashboard/bank-accounts/components/edit-bank-account-dialog.tsx` | Retrofit; `footer` slot with `DialogClose`-cancel |
| `src/app/dashboard/bank-accounts/components/adjust-balance-dialog.tsx` | Retrofit; `footer` slot with `DialogClose`-cancel |
| `src/app/dashboard/bank-accounts/components/transfer-funds-dialog.tsx` | Retrofit; `footer` slot with `DialogClose`-cancel |
| `src/app/dashboard/bank-accounts/components/withdraw-funds-dialog.tsx` | Retrofit; `footer` slot with `DialogClose`-cancel |
| `src/app/dashboard/costos-operativos/components/complete-alert-dialog.tsx` | Retrofit; `footer` slot with 3 buttons |
| `src/app/dashboard/receivables/components/receivable-payment-dialog.tsx` | Retrofit; `footer` slot |
| `src/app/dashboard/loyalty/components/reward-expense-dialog.tsx` | Retrofit; `footer` slot |

**Not touched:** `adjust-tokens-dialog.tsx`, `bank-statement-sync-dialog.tsx`,
`generate-accounts-qr-dialog.tsx`, `generate-branch-qr-dialog.tsx`,
`generate-loyalty-qr-dialog.tsx`, `token-history-dialog.tsx`,
`transaction-detail-dialog.tsx`.

---

## Approach

1. Create `src/components/ui/form-dialog.tsx` implementing the full `<FormDialog>`
   interface (see signature below).
2. Retrofit the 15 standard-footer dialogs one at a time: replace
   `<Dialog …> <DialogTrigger …> <DialogContent …> <DialogHeader …> <form> <div
   className="dashboard-dialog-body"> … <DialogFooter …>` with a single
   `<FormDialog …>{children}</FormDialog>`, passing the exact same props as computed
   strings where titles/labels vary by mode.
3. Normalize the 2 type dialogs: same as step 2 plus add a `description` prop and
   remove the non-standard `<div className="mt-6 flex justify-end gap-2">` footer.
4. Retrofit the 7 custom-footer dialogs: same shell replacement, but pass the
   existing button JSX as `footer={…}` to replace the default footer. Preserve
   `DialogClose` on cancel buttons that already used it.
5. Run `npm run lint`, `npm run typecheck`, `npm run build` after all 22 retrofits.

---

## `<FormDialog>` TypeScript signature

```tsx
// src/components/ui/form-dialog.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  // Dialog open state
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Header
  title: string;
  description?: string;
  /** Node rendered inside <DialogHeader> after the title/description group.
   *  Used by dialogs that place UI (e.g. a receipt-upload button) in the header. */
  headerExtra?: React.ReactNode;

  // Form submission
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  /** Covers both isValid (most dialogs) and isDirty (branch-sync-settings). */
  canSubmit: boolean;
  submitLabel: string;
  /** Defaults to "Guardando…" */
  submittingLabel?: string;
  /** Defaults to "Cancelar" */
  cancelLabel?: string;

  // Layout / trigger
  /** When provided, renders <DialogTrigger asChild>{trigger}</DialogTrigger>. */
  trigger?: React.ReactNode;
  /** Appended to the default "dashboard-dialog-content" className.
   *  Use for per-dialog max-width: "max-w-sm", "max-w-lg", "max-w-2xl", etc. */
  contentClassName?: string;

  // Escape hatch: when provided, REPLACES the default Cancelar+Submit footer.
  footer?: React.ReactNode;

  children: React.ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitLabel,
  submittingLabel = "Guardando…",
  cancelLabel = "Cancelar",
  trigger,
  contentClassName,
  footer,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn("dashboard-dialog-content", contentClassName)}
      >
        <DialogHeader className="dashboard-dialog-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="max-w-2xl leading-6">
                  {description}
                </DialogDescription>
              )}
            </div>
            {headerExtra}
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">{children}</div>

          {footer ?? (
            <DialogFooter className="dashboard-dialog-footer">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                className="rounded-2xl"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Important caveats on the header layout:** Most dialogs use a simple stacked
title+description layout (no `headerExtra`). The `flex sm:flex-row` wrapper in the
header is only meaningful when `headerExtra` is present; for dialogs without it the
layout collapses to a single column. If any individual dialog's existing header
differs structurally (e.g. it already uses a plain stack without a flex row), the
implementer should preserve that structure via the `headerExtra` prop or by keeping
the title/description as children when the flex wrapper would misalign the UI.

---

## Dialog inventory table

The table below documents every dialog to retrofit. The implementer uses it to tick
off each dialog independently.

| Dialog file (under `src/app/dashboard/`) | Footer | Has trigger | Create/edit modes | `contentClassName` (max-w) | Normalized | Special caveat |
|---|---|---|---|---|---|---|
| `payables/components/new-payable-dialog.tsx` | default | yes | create only | `max-w-xl lg:max-w-2xl` + `max-h-[90vh] overflow-y-auto` | — | — |
| `branches/components/new-branch-dialog.tsx` | default | yes | create only | (check file) | — | — |
| `clients/components/new-client-dialog.tsx` | default | yes | create only | (check file) | — | — |
| `receivables/components/new-receivable-dialog.tsx` | default | yes | create only | (check file) | — | — |
| `users/components/new-user-dialog.tsx` | default | yes | create only | (check file) | — | — |
| `users/components/edit-user-dialog.tsx` | default | no | create + edit | (check file) | — | Computed title/submitLabel |
| `bank-accounts/components/new-bank-account-dialog.tsx` | default | yes | create only | `max-w-2xl` + `max-h-[90vh] overflow-y-auto` | — | Default footer's cancel uses `onOpenChange(false)` (was `DialogClose`); must be semantically equivalent |
| `transactions/expenses/components/new-expense-dialog.tsx` | default | yes (via prop) | create + edit | `max-w-xl lg:max-w-2xl` + `max-h-[90vh] overflow-y-auto` | — | `headerExtra` = receipt-upload block (create mode only); computed title/submitLabel |
| `transactions/incomes/components/new-income-dialog.tsx` | default | yes | create + edit | (check file) | — | Computed title/submitLabel |
| `invoices/components/new-invoice-dialog.tsx` | default | yes | create + edit | (check file) | — | Computed title/submitLabel |
| `costos-operativos/components/new-operating-cost-dialog.tsx` | default | yes | create + edit | (check file) | — | Computed title/submitLabel |
| `link-de-pago/components/new-link-payment-dialog.tsx` | default | yes | create only | (check file) | — | — |
| `branches/components/branch-sync-settings-dialog.tsx` | default | no | create only | `max-w-lg` + `max-h-[90vh] overflow-y-auto` | — | `canSubmit={isDirty}` |
| `parameters/expense-types/components/new-expense-type-dialog.tsx` | default | yes | create only | `max-w-sm` | YES — add description | Remove old non-standard footer div |
| `parameters/income-types/components/new-income-type-dialog.tsx` | default | yes | create only | `max-w-sm` | YES — add description | Remove old non-standard footer div |
| `bank-accounts/components/edit-bank-account-dialog.tsx` | slot | no | edit only | `max-w-2xl` + `max-h-[90vh] overflow-y-auto` | — | `DialogClose`-cancel in footer slot |
| `bank-accounts/components/adjust-balance-dialog.tsx` | slot | no | — | `max-w-lg` + `max-h-[90vh] overflow-y-auto` | — | `DialogClose`-cancel in footer slot |
| `bank-accounts/components/transfer-funds-dialog.tsx` | slot | no | — | (check file) | — | `DialogClose`-cancel in footer slot |
| `bank-accounts/components/withdraw-funds-dialog.tsx` | slot | no | — | (check file) | — | `DialogClose`-cancel in footer slot |
| `costos-operativos/components/complete-alert-dialog.tsx` | slot | no | — | `max-w-xl` + `max-h-[90vh] overflow-y-auto` | — | 3-button footer: cancel + secondary + primary; footer block uses `border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7` |
| `receivables/components/receivable-payment-dialog.tsx` | slot | no | — | (check file) | — | Footer via `<DialogFooter>` already; reproduce exactly |
| `loyalty/components/reward-expense-dialog.tsx` | slot | no | — | `max-w-lg` | — | Footer via `<DialogFooter className="gap-2 border-t ...">` — reproduce exactly |

> "check file" entries: the implementer reads the file before touching it and copies
> the exact class string into `contentClassName`. Every width must be preserved
> verbatim; no normalization.

---

## Caveats summary

1. **`headerExtra` slot:** Only `new-expense-dialog` has upload UI in the header
   (the `<div className="flex shrink-0 items-center gap-2">` block inside
   `<DialogHeader>`). Pass it as `headerExtra`. `new-bank-account-dialog` and
   `edit-bank-account-dialog` have logo UI in the **body** — leave it in
   `children`.

2. **`DialogClose`-based cancel:** `new-bank-account-dialog` used `<DialogClose
   asChild>` around the cancel button. After retrofit, the default footer calls
   `onOpenChange(false)` instead. This is semantically equivalent (both close the
   dialog); no behavior change for the user. The four bank-operation custom-footer
   dialogs (`adjust-balance`, `transfer-funds`, `withdraw-funds`,
   `edit-bank-account`) must preserve `DialogClose` inside the `footer` slot since
   the spec requires reproducing their exact button set.

3. **`isDirty` mapping:** `branch-sync-settings-dialog` derives submit availability
   from `isDirty` (not `isValid`). Map it: `canSubmit={isDirty}`.

4. **Content widths:** No width normalization. Each dialog's exact `max-w-*`
   (including responsive variants like `lg:max-w-2xl`) must survive the retrofit as
   the `contentClassName` value.

5. **`complete-alert-dialog` footer structure:** Its custom footer is a `<div
   className="border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7">` wrapping
   a flex row — not a `<DialogFooter>`. Pass that entire `<div>` as the `footer`
   slot verbatim.

6. **Dialogs with no `DialogDescription` today** (e.g. `edit-bank-account-dialog`,
   `adjust-balance-dialog`, `transfer-funds-dialog`, `withdraw-funds-dialog`): omit
   the `description` prop; the slot renders nothing (R5).

---

## Rejected alternative

**Monolithic prop-heavy component with `footerVariant`, `extraFooterButtons`, and
boolean flags** — rejected because it requires encoding every footer permutation
inside the component, producing a god-component that must be modified for every new
dialog variant. The composable `footer` slot lets each dialog own its bespoke
buttons without touching the shared component, which aligns with the single-concern
principle in `docs/architecture.md` and avoids boolean-prop proliferation.
