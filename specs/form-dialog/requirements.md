# Requirements — form-dialog

> EARS notation. Every requirement is numbered and objectively verifiable. Each must
> be covered by at least one task-level verification.
>
> Scope: create `src/components/ui/form-dialog.tsx` and retrofit 22 form dialogs to
> use it. No actions, hooks, zod schemas, or data changes. `adjust-tokens` and the
> 6 non-form dialogs are untouched.

---

## Component structure

### R1

WHEN `<FormDialog>` is rendered with `open={true}`, the system SHALL render a
`<Dialog>` containing a `<DialogContent>` whose `className` includes
`dashboard-dialog-content` plus any value passed via the `contentClassName` prop.

### R2

WHEN a `trigger` prop is provided to `<FormDialog>`, the system SHALL render the
value inside a `<DialogTrigger asChild>` wrapper so the element opens the dialog on
activation.

### R3

WHEN no `trigger` prop is provided to `<FormDialog>`, the system SHALL render no
`<DialogTrigger>` element in the output.

### R4

WHEN `<FormDialog>` is rendered, the system SHALL render a `<DialogHeader
className="dashboard-dialog-header">` containing a `<DialogTitle>` with the value
of the `title` prop and, when the `description` prop is provided, a
`<DialogDescription>` with that value.

### R5

WHEN the `description` prop is omitted from `<FormDialog>`, the system SHALL render
no `<DialogDescription>` element.

### R6

WHEN the `headerExtra` prop is provided to `<FormDialog>`, the system SHALL render
that node inside the `<DialogHeader>` block, after the title/description group, so
extra header UI (such as a receipt-upload button) appears in the header area.

### R7

WHEN `<FormDialog>` is rendered, the system SHALL wrap `children` in a `<form
onSubmit={onSubmit}>` element containing a `<div className="dashboard-dialog-body">`.

---

## Default footer

### R8

WHEN the `footer` prop is **not** provided to `<FormDialog>`, the system SHALL
render a `<DialogFooter className="dashboard-dialog-footer">` as the last element
inside the `<form>`, containing exactly:
1. A cancel button (`type="button"`, `variant="outline"`, `className="rounded-2xl"`,
   `onClick={() => onOpenChange(false)}`), labelled with `cancelLabel` (default
   `"Cancelar"`).
2. A submit button (`type="submit"`, `className="rounded-2xl"`,
   `disabled={isSubmitting || !canSubmit}`), labelled with `{isSubmitting ?
   submittingLabel : submitLabel}`.

### R9

WHEN the `footer` prop is **provided**, the system SHALL render that node in place
of the default `<DialogFooter>` and SHALL NOT render the default cancel+submit
buttons.

### R10

WHEN `isSubmitting` is `true` and `footer` is not provided, the system SHALL display
the `submittingLabel` string on the submit button (default `"Guardando…"`).

### R11

WHEN `isSubmitting` is `true` and `footer` is not provided, the system SHALL disable
the cancel button.

### R12

WHEN `canSubmit` is `false` and `footer` is not provided, the system SHALL disable
the submit button regardless of `isSubmitting`.

---

## Retrofit — standard-footer dialogs (15 dialogs)

### R13

WHEN any of the 15 standard-footer dialogs listed below is opened, the system SHALL
render a DOM structure and visible labels that are **byte-for-byte identical** (same
`dashboard-dialog-*` CSS classes, same title text, same `DialogDescription` text,
same submit/cancel labels, same `contentClassName` / `max-w-*` modifier, same
trigger if present) to the pre-refactor version:

- `new-payable-dialog`
- `new-branch-dialog`
- `new-client-dialog`
- `new-receivable-dialog`
- `new-user-dialog`
- `edit-user-dialog`
- `new-bank-account-dialog`
- `new-expense-dialog`
- `new-income-dialog`
- `new-invoice-dialog`
- `new-operating-cost-dialog`
- `new-link-payment-dialog`
- `branch-sync-settings-dialog`
- `new-expense-type-dialog` (normalized — see R16)
- `new-income-type-dialog` (normalized — see R16)

### R14

WHEN `branch-sync-settings-dialog` is rendered, the system SHALL pass its `isDirty`
form flag as `canSubmit` to `<FormDialog>`, so the submit button is disabled when
the form has no unsaved changes.

### R15

WHEN a create/edit dialog that supports both modes (new-expense, new-income,
new-invoice, new-operating-cost, edit-user) is rendered, the system SHALL pass
a computed `title` string and a computed `submitLabel` string reflecting the current
mode to `<FormDialog>`, producing the same conditional text as the pre-refactor
version.

---

## Retrofit — normalized type dialogs (2 dialogs)

### R16

WHEN `new-expense-type-dialog` or `new-income-type-dialog` is opened after the
retrofit, the system SHALL:
a. Use `<FormDialog>` with `contentClassName="max-w-sm"`.
b. Add a `description` prop with a short Spanish description of the dialog's
   purpose (chosen during implementation; wording is at implementer discretion).
c. Render the standard default footer (Cancelar + Guardar) with the same disabled
   logic (`!isValid || isPending` mapped to `canSubmit` and `isSubmitting`).
d. Remove the previous non-standard footer (`<div className="mt-6 flex justify-end
   gap-2">`) entirely from the dialog.

---

## Retrofit — custom-footer dialogs (7 dialogs)

### R17

WHEN any of the 7 custom-footer dialogs listed below is opened, the system SHALL
render via `<FormDialog footer={<...>}>` a footer node that reproduces the exact
button set, labels, disabled conditions, and click handlers of the pre-refactor
version:

- `edit-bank-account-dialog` — one `DialogClose`-wrapped cancel + one submit
- `adjust-balance-dialog` — one `DialogClose`-wrapped cancel + one submit
- `transfer-funds-dialog` — one `DialogClose`-wrapped cancel + one submit
- `withdraw-funds-dialog` — one `DialogClose`-wrapped cancel + one submit
- `complete-alert-dialog` — cancel (`onClick onOpenChange(false)`) + secondary
  "Completar sin gasto" + primary "Completar y generar gasto"
- `receivable-payment-dialog` — cancel + submit "Registrar cobro"
- `reward-expense-dialog` — cancel + submit "Crear gasto y reiniciar"

### R18

WHEN the `footer` slot is used to reproduce a `DialogClose`-wrapped cancel button,
the system SHALL preserve `DialogClose` semantics (the button closes the dialog via
Radix's own close mechanism), maintaining the same behavior as the pre-refactor
version.

---

## Extra-header content

### R19

WHEN `new-expense-dialog` is retrofitted and rendered in create mode, the system
SHALL pass the receipt-upload button group (the `<div className="flex shrink-0
items-center gap-2">` block from the header) as the `headerExtra` prop so it
continues to appear inside the `<DialogHeader>` area, in the same visual position.

### R20

WHEN `new-expense-dialog` is rendered in edit mode, the system SHALL pass
`headerExtra={undefined}` (or omit it), preserving the existing conditional that
hides the upload UI in edit mode.

### R21

WHEN `new-bank-account-dialog` or `edit-bank-account-dialog` is retrofitted, the
system SHALL leave the logo-upload UI inside `children` (it lives in the form body,
not the header) and SHALL NOT pass it as `headerExtra`.

---

## Quality gate

### R22

AFTER all 22 retrofits are applied, running `npm run lint`, `npm run typecheck`, and
`npm run build` SHALL each exit with code 0 and produce no new errors or warnings
relative to the pre-refactor baseline.
