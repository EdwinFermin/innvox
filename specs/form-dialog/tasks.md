# Tasks — form-dialog

> 22 dialog files + 1 new component = 23 file changes total. Tasks are ordered
> so each can be committed and verified independently. Check each off as done.
> Every task lists the requirements it satisfies and the verification that proves it.
>
> This is a large refactor. The implementer MUST read each dialog file before
> editing it and MUST NOT alter any form logic, actions, hooks, or field layout.

---

## T1 — Create `src/components/ui/form-dialog.tsx`

Implement `<FormDialog>` exactly as specified in `design.md`:
- Props: `open`, `onOpenChange`, `title`, `description?`, `headerExtra?`,
  `onSubmit`, `isSubmitting`, `canSubmit`, `submitLabel`, `submittingLabel?`
  (default `"Guardando…"`), `cancelLabel?` (default `"Cancelar"`), `trigger?`,
  `contentClassName?`, `footer?`, `children`.
- Renders `<Dialog>` → optional `<DialogTrigger asChild>` → `<DialogContent
  className={cn("dashboard-dialog-content", contentClassName)}>` → `<DialogHeader
  className="dashboard-dialog-header">` (title, optional description, optional
  `headerExtra`) → `<form onSubmit>` → `<div className="dashboard-dialog-body">
  {children}</div>` → `footer ?? <DialogFooter className="dashboard-dialog-footer">
  {cancel}{submit}</DialogFooter>`.
- Default cancel: `type="button"` outline `rounded-2xl` calls `onOpenChange(false)`,
  disabled when `isSubmitting`.
- Default submit: `type="submit"` `rounded-2xl` disabled when `isSubmitting ||
  !canSubmit`, label `{isSubmitting ? submittingLabel : submitLabel}`.

**Covers:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12

**Verification:**
- [x] File exists at `src/components/ui/form-dialog.tsx`.
- [x] With `trigger` prop: DOM contains `[data-slot="dialog-trigger"]`.
- [x] Without `trigger` prop: no `[data-slot="dialog-trigger"]` in DOM.
- [x] With `description`: `<p data-slot="dialog-description">` is present.
- [x] Without `description`: no `[data-slot="dialog-description"]` in DOM.
- [x] With `headerExtra`: the node appears inside `[data-slot="dialog-header"]`.
- [x] With `footer` prop: default cancel+submit buttons are absent; the `footer`
  node is present inside `<form>`.
- [x] Without `footer`: default buttons are present.
- [x] `isSubmitting=true`: submit button shows `submittingLabel`, cancel is disabled.
- [x] `canSubmit=false`: submit button has `disabled` attribute.
- [x] `npm run typecheck` exits 0 after this task alone.

---

## T2 — Retrofit `new-payable-dialog`

Replace Dialog/DialogContent/DialogHeader/form/DialogFooter shell with
`<FormDialog open onOpenChange title="Nueva cuenta por pagar"
description="Registra una obligación…" contentClassName="max-h-[90vh] max-w-xl
overflow-y-auto lg:max-w-2xl" trigger={<Button …>} onSubmit isSubmitting={isPending}
canSubmit={isValid} submitLabel="Guardar cuenta por pagar">`.

**Covers:** R13

**Verification:**
- [x] Dialog opens; header shows title and description.
- [x] Submit button label is "Guardar cuenta por pagar"; disabled when form invalid or `isPending`.
- [x] Cancel closes dialog.
- [x] Trigger renders "Nueva cuenta por pagar" button.

---

## T3 — Retrofit `new-branch-dialog`

Read file, then replace shell. Pass exact `contentClassName`, trigger, labels.

**Covers:** R13

**Verification:** Same checklist pattern as T2 for this dialog.

---

## T4 — Retrofit `new-client-dialog`

Read file, then replace shell.

**Covers:** R13

**Verification:** Same checklist pattern as T2 for this dialog.

---

## T5 — Retrofit `new-receivable-dialog`

Read file, then replace shell.

**Covers:** R13

**Verification:** Same checklist pattern as T2 for this dialog.

---

## T6 — Retrofit `new-user-dialog`

Read file, then replace shell.

**Covers:** R13

**Verification:** Same checklist pattern as T2 for this dialog.

---

## T7 — Retrofit `edit-user-dialog`

Read file. Pass `title` and `submitLabel` as computed strings reflecting the
current mode (create vs edit).

**Covers:** R13, R15

**Verification:**
- [x] Create mode: title and submit label match pre-refactor create strings.
- [x] Edit mode: title and submit label match pre-refactor edit strings.
- [x] No `DialogTrigger` rendered (no trigger prop).

---

## T8 — Retrofit `new-bank-account-dialog`

Read file. The existing footer used `<DialogClose asChild>` around cancel. After
retrofit the default footer calls `onOpenChange(false)` — semantically equivalent
(both close the dialog). Pass `trigger={<Button …>}`, correct `contentClassName`
(`max-h-[90vh] max-w-2xl overflow-y-auto`). Logo-upload UI stays in `children`
(it is in the form body, not the header).

**Covers:** R13, R21

**Verification:**
- [x] Cancel button closes dialog.
- [x] Logo-upload UI is inside the form body area, not the header.
- [x] Submit disabled when `!isValid || isPending`.

---

## T9 — Retrofit `new-expense-dialog`

Read file. Pass `headerExtra` = the receipt-upload button group (only when
`!isEditMode`; pass `undefined` in edit mode). Pass computed `title` and
`submitLabel`. Pass `trigger` (supports an external `trigger` prop already).
`contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"`.

**Covers:** R13, R15, R19, R20

**Verification:**
- [x] Create mode: receipt-upload button appears in the header area.
- [x] Edit mode: receipt-upload button is absent; `headerExtra` is not passed.
- [x] Title and submitLabel reflect create/edit mode.
- [x] `dashboard-dialog-body` wraps field layout.

---

## T10 — Retrofit `new-income-dialog`

Read file. Computed title/submitLabel.

**Covers:** R13, R15

**Verification:** Create mode and edit mode show correct title and submit label.

---

## T11 — Retrofit `new-invoice-dialog`

Read file. Computed title/submitLabel.

**Covers:** R13, R15

**Verification:** Same as T10.

---

## T12 — Retrofit `new-operating-cost-dialog`

Read file. Computed title/submitLabel.

**Covers:** R13, R15

**Verification:** Same as T10.

---

## T13 — Retrofit `new-link-payment-dialog`

Read file, then replace shell.

**Covers:** R13

**Verification:** Same checklist pattern as T2.

---

## T14 — Retrofit `branch-sync-settings-dialog`

Read file. Pass `canSubmit={isDirty}`. No trigger. `contentClassName="max-h-[90vh]
max-w-lg overflow-y-auto"`.

**Covers:** R13, R14

**Verification:**
- [x] Submit button disabled when `isDirty` is false.
- [x] Submit button enabled after a field value changes.
- [x] No `<DialogTrigger>` rendered.

---

## T15 — Normalize `new-expense-type-dialog`

Read file. Replace full dialog shell with `<FormDialog contentClassName="max-w-sm"
trigger={<Button …>} description="<short Spanish description>"
submitLabel="Guardar" submittingLabel="Guardando…" canSubmit={isValid}
isSubmitting={isPending}>`. Remove the old `<div className="mt-6 flex justify-end
gap-2">` footer. Keep the `<div className="grid gap-6">` field layout in children.

**Covers:** R13, R16

**Verification:**
- [x] `<DialogDescription>` present with a non-empty string.
- [x] Standard Cancelar + Guardar footer present.
- [x] Old non-standard `mt-6 flex justify-end gap-2` div is gone.
- [x] Trigger renders "Nuevo tipo de gasto" button.

---

## T16 — Normalize `new-income-type-dialog`

Same approach as T15.

**Covers:** R13, R16

**Verification:** Same as T15 for income type.

---

## T17 — Retrofit `edit-bank-account-dialog` (custom footer)

Read file. Pass `footer={<div className="flex justify-end gap-2"><DialogClose
asChild><Button variant="outline">Cancelar</Button></DialogClose><Button
type="submit" disabled={…}>…</Button></div>}`. The dialog has no trigger. Check
existing width (`max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto`).

**Covers:** R17, R18

**Verification:**
- [x] Footer contains a `<DialogClose>`-wrapped cancel button.
- [x] Footer contains a submit button with correct label and disabled logic.
- [x] No default `dashboard-dialog-footer` present.
- [x] `DialogClose` cancel closes the dialog via Radix mechanism.

---

## T18 — Retrofit `adjust-balance-dialog` (custom footer)

Read file. Pass `footer` with `<DialogClose asChild>` cancel + submit. Width
`max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto`.

**Covers:** R17, R18

**Verification:** Same pattern as T17.

---

## T19 — Retrofit `transfer-funds-dialog` (custom footer)

Read file. Pass `footer` with `<DialogClose asChild>` cancel + submit "Mover".
Use exact `contentClassName` from the file.

**Covers:** R17, R18

**Verification:** Same pattern as T17; submit label is "Mover".

---

## T20 — Retrofit `withdraw-funds-dialog` (custom footer)

Read file. Pass `footer` with `<DialogClose asChild>` cancel + submit.
Use exact `contentClassName` from the file.

**Covers:** R17, R18

**Verification:** Same pattern as T17.

---

## T21 — Retrofit `complete-alert-dialog` (3-button custom footer)

Read file. Pass the full 3-button `<div className="border-t border-border/60
bg-muted/15 px-6 py-4 sm:px-7">` block as the `footer` slot. The three buttons
are: cancel (`onClick={() => onOpenChange(false)}`), secondary "Completar sin gasto"
(`type="button"` `variant="secondary"`), and primary "Completar y generar gasto"
(`type="submit"`). `contentClassName="dashboard-dialog-content max-h-[90vh]
gap-0 overflow-y-auto sm:max-w-xl"`.

**Covers:** R17

**Verification:**
- [x] Three buttons present in footer.
- [x] Primary button `disabled={!isValid || isBusy}`.
- [x] Secondary button `disabled={isBusy}`.
- [x] Cancel calls `onOpenChange(false)`.
- [x] No default `dashboard-dialog-footer` present.

---

## T22 — Retrofit `receivable-payment-dialog` (custom footer)

Read file. Pass footer reproducing the existing `<DialogFooter>` with cancel and
"Registrar cobro" submit. Use exact `contentClassName`.

**Covers:** R17

**Verification:**
- [x] Footer contains cancel + "Registrar cobro" submit.
- [x] Submit disabled when `!isValid || isPending`.

---

## T23 — Retrofit `reward-expense-dialog` (custom footer)

Read file. Pass footer reproducing `<DialogFooter className="gap-2 border-t
border-border/60 bg-muted/15 px-6 py-4 sm:px-7">` with cancel and "Crear gasto y
reiniciar" submit. `contentClassName="dashboard-dialog-content max-w-lg"`.

**Covers:** R17

**Verification:**
- [x] Footer matches pre-refactor class string and button set.
- [x] Submit label is "Crear gasto y reiniciar".

---

## T24 — Run quality gate

After all 22 retrofits, run:

```bash
npm run lint
npm run typecheck
npm run build
```

All three must exit 0. Fix any errors before marking this task done.

**Covers:** R22

**Verification:**
- [x] `npm run lint` exits 0, no new warnings.
- [x] `npm run typecheck` exits 0, no new type errors.
- [x] `npm run build` exits 0, no new build errors.

---

## Traceability

| Requirement | Task(s) | Verification |
|---|---|---|
| R1 — DialogContent with dashboard-dialog-content | T1 | T1 checklist: className includes `dashboard-dialog-content` |
| R2 — trigger renders DialogTrigger asChild | T1 | T1 checklist: `[data-slot="dialog-trigger"]` present |
| R3 — no trigger → no DialogTrigger | T1 | T1 checklist: no `[data-slot="dialog-trigger"]` |
| R4 — DialogHeader with title and optional description | T1 | T1 checklist: title and description slots |
| R5 — no description → no DialogDescription | T1 | T1 checklist: no `[data-slot="dialog-description"]` |
| R6 — headerExtra renders in DialogHeader | T1, T9 | T1 checklist; T9: receipt-upload visible in header |
| R7 — children wrapped in form + dashboard-dialog-body | T1 | T1 checklist: `<div class="dashboard-dialog-body">` wraps children |
| R8 — default footer = cancel + submit buttons | T1 | T1 checklist: both buttons present without footer prop |
| R9 — footer prop replaces default footer | T1, T17–T23 | T1 checklist; T17–T23: default buttons absent |
| R10 — isSubmitting → submittingLabel on submit | T1 | T1 checklist: button text = submittingLabel |
| R11 — isSubmitting → cancel disabled | T1 | T1 checklist: cancel has `disabled` |
| R12 — canSubmit=false → submit disabled | T1 | T1 checklist: submit has `disabled` |
| R13 — 15 standard-footer dialogs render identically | T2–T16 | Per-dialog verification checklists |
| R14 — branch-sync-settings: canSubmit=isDirty | T14 | T14 checklist: disabled on clean, enabled on dirty |
| R15 — computed title/submitLabel for create/edit | T7, T9–T12 | Mode-switch check in each task |
| R16 — type dialogs normalized with description + standard footer | T15, T16 | T15–T16 checklists |
| R17 — 7 custom-footer dialogs: exact button set reproduced | T17–T23 | Per-dialog footer verification |
| R18 — DialogClose-cancel preserved in footer slot | T17–T20 | T17–T20 checklists: DialogClose-wrapped cancel |
| R19 — new-expense headerExtra = receipt-upload (create mode) | T9 | T9 checklist: upload block in header create mode |
| R20 — new-expense headerExtra absent in edit mode | T9 | T9 checklist: no upload block in edit mode |
| R21 — bank-account logo UI stays in children (body) | T8 | T8 checklist: logo in form body, not header |
| R22 — lint + typecheck + build exit 0 | T24 | T24 checklist: all three commands exit 0 |
