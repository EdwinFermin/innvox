# Discovery — form-dialog

> Written by the **leader** from real exploration. Stretch/code-health feature
> (no deps). Stays `needs_clarification` until the human resolves the open
> questions.

## Request

Extract a shared form-dialog layout so create/edit dialogs stop copy-pasting the
Dialog → Content → Header → form → Footer shell.

## Findings

29 dialog files; **23 are form dialogs**, 6 are non-form (QR generators, detail/
history views, the bank-statement reconciliation tool) — those are out of scope.

The reference shell (`new-payable-dialog.tsx` 104–244) is consistent: `<Dialog
open onOpenChange>` → optional `<DialogTrigger>` → `<DialogContent
className="dashboard-dialog-content …">` → `<DialogHeader>` (title + description)
→ `<form onSubmit>` → `<div className="dashboard-dialog-body">` (page-specific
fields) → `<DialogFooter className="dashboard-dialog-footer">` (Cancelar outline +
Submit with `disabled={!isValid || isPending}`, label `{isPending ? "Guardando…"
: "<action>"}`). The `dashboard-dialog-*` classes are global CSS.

The 23 form dialogs split into:

- **~15 standard-footer fits** (clean): new-payable, new-branch, new-client,
  new-receivable, new-user, edit-user, new-bank-account, new-expense, new-income,
  new-invoice, new-operating-cost, new-link-payment, branch-sync-settings (uses
  `isDirty` instead of `isValid`), + a couple more. Variations they exercise:
  controlled vs self-managed open, trigger present vs absent, create vs
  create/edit (conditional title/label), content max-width (`max-w-sm` →
  `max-w-3xl`).
- **~7 custom-footer dialogs:** edit-bank-account, adjust-balance, transfer-funds,
  withdraw-funds, complete-alert (3 buttons), receivable-payment, reward-expense.
  These skip the `DialogFooter` wrapper and/or add extra buttons.
- **1 no-submit:** adjust-tokens (buttons fire mutations directly, no form
  submit).
- **2 minimal:** new-expense-type, new-income-type — `max-w-sm`, **no
  DialogDescription**, non-standard mini footer.

What's always per-dialog (stays put): the `useForm`+`zodResolver` setup, the
`useMutation`+`toast`+`mapError`+`invalidateQueries`, and the field layout.

## Affected areas

- New `src/components/ui/form-dialog.tsx` (the shared shell).
- The retrofitted dialog files (scope per Q2/Q3).
- No actions/hooks/data changes.

## Approaches considered

- **Composable `<FormDialog>` (leaning toward):** owns Dialog + Content (with
  `contentClassName` override) + Header (title + optional description) + `<form
  onSubmit>` + a **default** DialogFooter (Cancelar + Submit driven by
  `submitLabel`/`submittingLabel`/`isSubmitting`/`canSubmit`). Escape hatches via
  composition: optional `description`, optional `trigger`, and an optional
  `footer` slot that *replaces* the default footer for the custom-footer dialogs.
  Avoids boolean-prop proliferation; edge cases opt out cleanly.
- **Monolithic prop-heavy component:** one component with `footerVariant`,
  `extraFooterButtons`, etc. covering all 23. Rejected — it becomes a
  god-component and an anti-pattern (per the composition guidance).

## Open questions ← a human must answer these

1. **Component design:** focused `<FormDialog>` with a `footer` escape-hatch slot
   (composition) — or a single prop-heavy component that encodes every footer
   variation? Recommendation: composition.
2. **Retrofit scope:** (a) the ~15 standard-footer CRUD create/edit dialogs only,
   leaving the ~7 custom-footer + adjust-tokens on the raw Dialog primitives;
   (b) all 22 form dialogs (custom footers go through the `footer` slot;
   adjust-tokens excluded as it has no form submit); or (c) build the component +
   convert the reference + 2–3 as proof, retrofit the rest later.
   Recommendation: (a) — highest value, lowest risk; the specialized
   bank-operation dialogs keep their bespoke footers for now.
3. **Minimal type dialogs** (new-expense-type, new-income-type): bring them onto
   `<FormDialog>` — which gives them a description and the standard footer (small
   UX uplift) — or leave them as tiny custom dialogs? Recommendation: bring them
   on (description is optional, so no forced copy).

## Assumptions

- `<FormDialog>` prop surface: `open`, `onOpenChange`, `title`, `description?`,
  `onSubmit`, `isSubmitting`, `canSubmit` (covers both `isValid` and `isDirty`
  call sites), `submitLabel`, `submittingLabel?` (default "Guardando…"),
  `cancelLabel?` (default "Cancelar"), `trigger?`, `contentClassName?`, `footer?`
  (replaces the default footer), `children`.
- Pure refactor: each retrofitted dialog renders identically (same classes, same
  labels, same disabled logic). create/edit dialogs keep their conditional
  title/label by passing computed strings.
- Out of scope: the 6 non-form dialogs, adjust-tokens (no submit), and (pending
  Q2) the custom-footer operation dialogs. No actions/hooks/data changes.

## Resolution ← filled in after the human answers

- **Q1 → Composable `<FormDialog>` with a `footer` escape-hatch slot.** No boolean
  footer variants.
- **Q2 → Retrofit all 22 form dialogs.** Custom-footer dialogs go through the
  `footer` slot. `adjust-tokens` is EXCLUDED (no form submit). The 6 non-form
  dialogs remain out of scope.
- **Q3 → Normalize the minimal type dialogs** (new-expense-type, new-income-type)
  onto `<FormDialog>`; they gain a description and the standard footer.

### `<FormDialog>` contract (composition, no boolean footer variants)

Props: `open`, `onOpenChange`, `title`, `description?`, `onSubmit`,
`isSubmitting`, `canSubmit` (covers both `isValid` and `isDirty` call sites),
`submitLabel`, `submittingLabel?` ("Guardando…"), `cancelLabel?` ("Cancelar"),
`trigger?` (renders `<DialogTrigger>` when present), `contentClassName?`
(per-dialog max-width), `headerExtra?` (optional node rendered in the header for
dialogs with upload UI — see caveats), `footer?` (when provided, REPLACES the
default Cancelar+Submit footer), and `children` (the form body/fields).

Default footer = `dashboard-dialog-footer` with Cancelar (outline, closes) +
Submit (`disabled={isSubmitting || !canSubmit}`, label `{isSubmitting ?
submittingLabel : submitLabel}`).

### The 22 dialogs to retrofit

Standard footer (use default footer): new-payable, new-branch, new-client,
new-receivable, new-user, edit-user, new-bank-account, new-expense, new-income,
new-invoice, new-operating-cost, new-link-payment, branch-sync-settings
(`canSubmit` = its `isDirty`), new-expense-type*, new-income-type* (*normalized:
add a description).

Custom footer (use the `footer` slot, reproduce their exact buttons):
edit-bank-account, adjust-balance, transfer-funds, withdraw-funds, complete-alert
(3 buttons), receivable-payment, reward-expense.

Excluded: adjust-tokens (no form submit) + the 6 non-form dialogs.

### Caveats the implementer must respect (preserve identical output)

- **Extra header content:** `new-expense` (receipt upload in the header) and
  `new-bank-account` (logo upload) put UI in the header today. Preserve their
  layout via the `headerExtra` slot (do NOT silently relocate it). If a dialog's
  extra element is actually in the body, leave it in `children`.
- **Create/edit dialogs** (new-expense, new-income, new-invoice,
  new-operating-cost, edit-user, edit-bank-account): keep their conditional
  title/submitLabel by passing computed strings — no behavior change.
- **`DialogClose`-based cancel** (new-bank-account, edit-bank-account,
  adjust/transfer/withdraw): the default footer's Cancelar uses
  `onClick={() => onOpenChange(false)}`; if a dialog relied on `DialogClose`
  semantics, the behavior must stay equivalent (closes the dialog).
- **Content max-width varies** (`max-w-sm` … `max-w-3xl`): pass via
  `contentClassName`; do not normalize widths.
- **`branch-sync-settings`** disables submit on `!isDirty`, not `!isValid` — map
  to `canSubmit`.

- **Decision:** Build composable `<FormDialog>` (with `footer` + `headerExtra`
  slots); retrofit all 22 form dialogs reproducing each one's exact rendered
  output (labels, widths, footers, disabled logic). Pure refactor — no actions/
  hooks/data changes; adjust-tokens and the non-form dialogs untouched.
