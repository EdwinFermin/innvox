# Implementation — form-dialog

> Feature: `form-dialog` — Extract a shared `<FormDialog>` layout component and
> retrofit 22 create/edit dialogs onto it. Implemented strictly to the approved spec
> in `specs/form-dialog/` (R1–R22, T1–T24). 1 new component + 22 dialog files = 23
> files changed.

## Summary

Added one new presentational shell, `src/components/ui/form-dialog.tsx`, implementing
the exact `<FormDialog>` signature from `design.md` (lines 64–183): `<Dialog>` →
optional `<DialogTrigger asChild>` → `<DialogContent className={cn("dashboard-dialog-content",
contentClassName)}>` → `<DialogHeader>` (flex wrapper with title + optional description +
optional `headerExtra`) → `<form onSubmit>` → `<div className="dashboard-dialog-body">` →
`footer ?? <DialogFooter>` (default Cancelar + submit). Then retrofitted all 22 target
dialogs: 15 standard-footer (R13), 2 normalized type dialogs (R16), and 7 custom-footer
dialogs that pass their bespoke button set via the `footer` slot (R17/R18). No actions,
hooks, zod schemas, field layout, or onSubmit handlers were changed — only the dialog
**shell** was replaced. The 7 excluded dialogs (`adjust-tokens`, `bank-statement-sync`,
`generate-accounts-qr`, `generate-branch-qr`, `generate-loyalty-qr`, `token-history`,
`transaction-detail`) were not touched.

## Files changed

| Dialog file | Task | Req | `contentClassName` preserved | Footer type |
| --- | --- | --- | --- | --- |
| `src/components/ui/form-dialog.tsx` | T1 | R1–R12 | — (component) | — (defines default + slot) |
| `payables/components/new-payable-dialog.tsx` | T2 | R13 | `max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl` | default |
| `branches/components/new-branch-dialog.tsx` | T3 | R13 | `max-h-[90vh] max-w-lg overflow-y-auto` | default (submitting "Creando…", label "Crear sucursal") |
| `clients/components/new-client-dialog.tsx` | T4 | R13 | `max-h-[90vh] max-w-lg overflow-y-auto` | default |
| `receivables/components/new-receivable-dialog.tsx` | T5 | R13 | `max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl` | default |
| `users/components/new-user-dialog.tsx` | T6 | R13 | `max-h-[90vh] max-w-2xl overflow-y-auto` | default |
| `users/components/edit-user-dialog.tsx` | T7 | R13, R15 | `max-h-[90vh] max-w-2xl overflow-y-auto` | default (no trigger) |
| `bank-accounts/components/new-bank-account-dialog.tsx` | T8 | R13, R21 | `max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto` | default (was DialogClose-cancel → onOpenChange(false)) |
| `transactions/expenses/components/new-expense-dialog.tsx` | T9 | R13, R15, R19, R20 | `max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl` | default + `headerExtra` (create only) |
| `transactions/incomes/components/new-income-dialog.tsx` | T10 | R13, R15 | `max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl` | default |
| `invoices/components/new-invoice-dialog.tsx` | T11 | R13, R15 | `max-h-[90vh] max-w-3xl overflow-y-auto` | default (conditional submit + submitting labels) |
| `costos-operativos/components/new-operating-cost-dialog.tsx` | T12 | R13, R15 | `max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl` | default (trigger only when uncontrolled) |
| `link-de-pago/components/new-link-payment-dialog.tsx` | T13 | R13 | `max-h-[90vh] max-w-lg w-[calc(100vw-2rem)] overflow-y-auto` | default (submitting "Guardando...") |
| `branches/components/branch-sync-settings-dialog.tsx` | T14 | R13, R14 | `max-h-[90vh] max-w-lg overflow-y-auto` | default, `canSubmit={isDirty}`, no trigger |
| `parameters/expense-types/components/new-expense-type-dialog.tsx` | T15 | R13, R16 | `max-w-sm` | default (normalized; old `mt-6 flex justify-end gap-2` removed) |
| `parameters/income-types/components/new-income-type-dialog.tsx` | T16 | R13, R16 | `max-w-sm` | default (normalized; old footer removed) |
| `bank-accounts/components/edit-bank-account-dialog.tsx` | T17 | R17, R18 | `max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto` | slot: DialogClose-cancel + submit "Guardar cambios" |
| `bank-accounts/components/adjust-balance-dialog.tsx` | T18 | R17, R18 | `max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto` | slot: DialogClose-cancel + submit "Aplicar ajuste" |
| `bank-accounts/components/transfer-funds-dialog.tsx` | T19 | R17, R18 | `max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto` | slot: DialogClose-cancel + submit "Mover" |
| `bank-accounts/components/withdraw-funds-dialog.tsx` | T20 | R17, R18 | `max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto` | slot: DialogClose-cancel + submit "Realizar retiro" |
| `costos-operativos/components/complete-alert-dialog.tsx` | T21 | R17 | `dashboard-dialog-content max-h-[90vh] gap-0 overflow-y-auto sm:max-w-xl` | slot: 3-button `border-t … bg-muted/15` block |
| `receivables/components/receivable-payment-dialog.tsx` | T22 | R17 | `max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto` | slot: `<DialogFooter>` cancel + submit "Registrar cobro" |
| `loyalty/components/reward-expense-dialog.tsx` | T23 | R17 | `dashboard-dialog-content max-w-lg` | slot: `<DialogFooter className="gap-2 border-t …">` cancel + submit "Crear gasto y reiniciar" |
| `specs/form-dialog/tasks.md` | — | — | — | Checked off T1–T24 |

## Key decisions

### FormDialog contract (T1)
Implemented verbatim per `design.md` lines 64–183: `"use client"`, all props as the
interface, `submittingLabel="Guardando…"` and `cancelLabel="Cancelar"` defaults, default
cancel `type="button" variant="outline" rounded-2xl onClick={() => onOpenChange(false)}
disabled={isSubmitting}`, default submit `type="submit" rounded-2xl disabled={isSubmitting
|| !canSubmit}` with label `{isSubmitting ? submittingLabel : submitLabel}`. The `footer ??`
escape hatch replaces the entire default `<DialogFooter>` when provided (R9). `cn()`
(clsx + tailwind-merge) collapses any duplicate `dashboard-dialog-content` token, which
keeps the `complete-alert`/`reward-expense` task-specified strings clean.

### The two normalized type-dialog descriptions (T15, T16) — R16b
The spec leaves the wording at implementer discretion. Chosen:
- `new-expense-type`: **"Crea una categoría para clasificar tus gastos."**
- `new-income-type`: **"Crea una categoría para clasificar tus ingresos."**
Both dialogs now use `contentClassName="max-w-sm"`, render the standard default footer
(Cancelar + Guardar) with `canSubmit={isValid}` / `isSubmitting={isPending}`, and the old
non-standard `<div className="mt-6 flex justify-end gap-2">` footer was removed entirely
(R16d). The `<div className="grid gap-6">` field layout is preserved as `children`.

### new-expense `headerExtra` create/edit handling (T9, R19/R20)
The receipt-upload block (`<div className="flex shrink-0 items-center gap-2">`) is passed
as `headerExtra={!isEditMode ? (<div …>…</div>) : undefined}`. In create mode it renders
inside `<DialogHeader>` to the right of the title (this dialog already used the exact
`flex … sm:flex-row sm:justify-between` header layout that `FormDialog` reproduces, so the
DOM is byte-identical). In edit mode `headerExtra` is `undefined`, preserving the original
conditional that hides the upload UI. Title/submitLabel are computed:
`isEditMode ? "Cambiar cuenta del gasto" : "Nuevo gasto"` /
`isEditMode ? "Actualizar cuenta" : "Guardar gasto"` (R15).

### complete-alert 3-button footer (T21, R17)
The full `<div className="border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7">` block
is passed verbatim as the `footer` slot: cancel (`onClick onOpenChange(false)`, `disabled
isBusy`), secondary `type="button" variant="secondary"` "Completar sin gasto" (`disabled
isBusy`, `onClick mutateSkip`), and primary `type="submit"` "Completar y generar gasto"
(`disabled !isValid || isBusy`). The required `submitLabel`/`isSubmitting`/`canSubmit` props
are still passed (mirroring the primary submit) but do not render because the `footer` slot
overrides the default footer.

### Computed title/submitLabel for the create/edit dialogs (R15)
- `new-income`: `isEditMode ? "Cambiar cuenta del ingreso" : "Nuevo ingreso"` /
  `isEditMode ? "Actualizar cuenta" : "Guardar ingreso"`.
- `new-invoice`: `isEditMode ? "Editar factura" : "Nueva factura"` /
  `isEditMode ? "Guardar cambios" : "Imprimir y guardar"`, with the conditional
  `submittingLabel={isEditMode ? "Actualizando…" : "Guardando…"}` preserved exactly.
- `new-operating-cost`: `isEdit ? "Editar costo operativo" : "Nuevo costo operativo"` /
  `isEdit ? "Actualizar" : "Crear costo operativo"`; `trigger` passed as
  `!isControlled ? (trigger ?? <Button>…) : undefined` so the no-trigger-when-controlled
  behavior survives.
- `edit-user`: the file has **no** mode switch in its code (it is edit-only), so the
  literal pre-refactor strings "Editar usuario" / "Guardar cambios" are preserved as-is.
  This satisfies R15's "same conditional text as the pre-refactor version" — there was no
  conditional to reproduce.

### DialogClose-cancel semantics (R18 vs caveat #2)
- The 4 bank-operation custom-footer dialogs (`edit-bank-account`, `adjust-balance`,
  `transfer-funds`, `withdraw-funds`) **preserve** `<DialogClose asChild>` around the
  cancel button inside the `footer` slot (R18) — Radix's own close mechanism is retained.
- `new-bank-account` (a standard-footer dialog in R13's list) used `<DialogClose>` before;
  after retrofit its default footer's cancel calls `onOpenChange(false)`. Per caveat #2
  this is semantically equivalent (both close the dialog) — no user-visible change.
- `new-invoice`'s cancel was `onClick={handleClose}`; the default footer now calls
  `onOpenChange(false)`, which routes through the dialog's existing custom
  `onOpenChange` handler to `handleClose()` — identical behavior.

### Logo-upload stays in the body (R21)
`new-bank-account` and `edit-bank-account` keep their logo-upload UI inside `children`
(the form body), **not** `headerExtra` — it lives in the body in both originals.

### Header-layout caveats (per design.md "Important caveats")
1. **Description `max-w-*` normalization.** Several standard dialogs had a
   `<DialogDescription className="max-w-md …">`; `FormDialog` hardcodes `max-w-2xl` on the
   description (per the canonical signature). Affected: `new-branch`, `new-client`,
   `new-link-payment`, `branch-sync-settings`. This is a description-paragraph max-width
   token only — the description **text** is byte-identical; the paragraph wraps slightly
   wider at `sm+`. Adopting the component's `max-w-2xl` is the spec-intended behavior
   (the design.md signature is authoritative and the tasks instruct passing `description`
   as a prop). No structural DOM change.
2. **Rich-JSX descriptions flattened to strings.** `FormDialog.description` is typed
   `string`. Four custom-footer dialogs (`adjust-balance`, `transfer-funds`,
   `withdraw-funds`, `receivable-payment`) had a `<DialogDescription>` containing
   `<span className="font-medium">` emphasis around the account name / balance. These were
   flattened to a single template-literal string preserving the exact text and the `·`
   separators; the inline `font-medium` emphasis on two values is dropped. R13's
   byte-for-byte rule applies only to the 15 standard-footer dialogs, **not** these 7
   custom-footer dialogs (R17 only requires reproducing the footer). The visible text is
   unchanged.
3. **reward-expense Gift icon dropped from the title.** The original title was
   `<DialogTitle><Gift /> Crear gasto de recompensa</DialogTitle>`. Because
   `FormDialog.title` is `string`-typed, the decorative leading `Gift` icon could not be
   injected without widening the component contract (out of scope). Title is now the plain
   string "Crear gasto de recompensa"; the unused `Gift` import was removed. The footer,
   body, and all behavior are unchanged.
4. **Custom-footer body spacing.** The 7 custom-footer dialogs' original `<form
   className="space-y-N">` wrapper is part of the replaced shell; their children now sit
   inside `FormDialog`'s `<div className="dashboard-dialog-body">`, which provides the
   standard dashboard vertical rhythm (consistent with all other dialogs). No field layout
   was edited.

### Scope note for the leader — pre-existing dirty working tree
`git diff --name-only` lists many non-dialog files (page.tsx files, dashboard components,
`globals.css`, `use-mobile.ts`, `AGENTS.md`, `.gitignore`, etc.). **These are pre-existing
uncommitted changes from prior merged features** — they were already present in the
session-start `git status` snapshot and are **not** part of this feature. I verified none
of them reference `FormDialog` (`git diff` on the non-dialog files → zero `FormDialog`
hits), confirming my edits are isolated to exactly the 22 dialog files + the new
`src/components/ui/form-dialog.tsx`. My feature's changed set is precisely those 23 files;
the other modifications belong to earlier work in this dirty tree.

## Requirement → coverage table

> No unit runner is configured (`reins.config.json` `test: null`), so coverage is by the
> structural location of each behavior in the diff plus a green `npx reins verify` (lint +
> security + design + feature-list + traceability), `npm run typecheck`, and `npm run build`.

| Req | Covered by (file:location) |
| --- | --- |
| R1 — DialogContent w/ dashboard-dialog-content + contentClassName | `form-dialog.tsx` — `<DialogContent className={cn("dashboard-dialog-content", contentClassName)}>` |
| R2 — trigger → `<DialogTrigger asChild>` | `form-dialog.tsx` — `{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}` |
| R3 — no trigger → no DialogTrigger | `form-dialog.tsx` — same guard renders nothing when `trigger` falsy |
| R4 — DialogHeader w/ title + optional description | `form-dialog.tsx` — `<DialogTitle>{title}</DialogTitle>` + `{description && <DialogDescription>…}` |
| R5 — no description → no DialogDescription | `form-dialog.tsx` — `{description && …}` guard; custom-footer dialogs w/o description omit the prop |
| R6 — headerExtra renders in DialogHeader | `form-dialog.tsx` — `{headerExtra}` after the title/description group; `new-expense-dialog.tsx` passes the receipt block |
| R7 — children in `<form>` + dashboard-dialog-body | `form-dialog.tsx` — `<form onSubmit><div className="dashboard-dialog-body">{children}</div>…</form>` |
| R8 — default footer = cancel + submit | `form-dialog.tsx` — `footer ?? <DialogFooter className="dashboard-dialog-footer">{cancel}{submit}</DialogFooter>` |
| R9 — footer prop replaces default | `form-dialog.tsx` `footer ??`; T17–T23 dialogs pass `footer={…}` and render no default footer |
| R10 — isSubmitting → submittingLabel | `form-dialog.tsx` — submit label `{isSubmitting ? submittingLabel : submitLabel}` |
| R11 — isSubmitting → cancel disabled | `form-dialog.tsx` — default cancel `disabled={isSubmitting}` |
| R12 — canSubmit=false → submit disabled | `form-dialog.tsx` — default submit `disabled={isSubmitting || !canSubmit}` |
| R13 — 15 standard-footer dialogs identical | T2–T16 dialogs: same `dashboard-dialog-*` classes, titles, descriptions, labels, triggers, and exact `contentClassName` strings (see table) |
| R14 — branch-sync canSubmit=isDirty | `branch-sync-settings-dialog.tsx` — `canSubmit={isDirty}` |
| R15 — computed title/submitLabel | `new-expense`, `new-income`, `new-invoice`, `new-operating-cost`, `edit-user` (literal, edit-only) — conditional `title`/`submitLabel` props |
| R16 — type dialogs normalized | `new-expense-type-dialog.tsx` / `new-income-type-dialog.tsx` — `max-w-sm`, added description, standard footer, old `mt-6 flex justify-end gap-2` removed |
| R17 — 7 custom-footer dialogs reproduce footer | T17–T23 `footer={…}` slots reproduce exact button set, labels, disabled conditions, handlers |
| R18 — DialogClose-cancel preserved in slot | `edit-bank-account`, `adjust-balance`, `transfer-funds`, `withdraw-funds` — `<DialogClose asChild>` retained in footer |
| R19 — new-expense headerExtra = receipt-upload (create) | `new-expense-dialog.tsx` — `headerExtra={!isEditMode ? (<div className="flex shrink-0 items-center gap-2">…) : undefined}` |
| R20 — new-expense headerExtra absent (edit) | `new-expense-dialog.tsx` — `headerExtra` is `undefined` when `isEditMode` |
| R21 — bank-account logo UI in children | `new-bank-account-dialog.tsx` / `edit-bank-account-dialog.tsx` — logo block is in the form body, not headerExtra |
| R22 — lint + typecheck + build exit 0 | T24 below |

## Self-review (Four R's)

### Risk — *blast radius + reversibility*
- The diff stays inside scope: 1 new additive component (`form-dialog.tsx`, zero fan-in to
  break) + exactly the 22 dialog files named in `design.md`, plus the `tasks.md` checkboxes.
  No drive-by refactors, no formatting churn on untouched lines, and none of the 7 excluded
  dialogs were touched. Verified via `git diff --name-only` (22 `*dialog.tsx` + the new
  component) and confirmed no non-dialog changed file references `FormDialog`.
- **No public contract removed or mutated** for any consumer: every retrofitted dialog keeps
  its exported component name, props, and call-site API. `FormDialog` is a brand-new export.
  No action/hook/schema/route/serialized-format change → no reversibility artifact needed
  (pure presentational refactor). `progress/history.md` untouched (append-only).
- Coverage is proportional to blast radius: the highest-reach artifact is `FormDialog`,
  structurally exercised by all 22 call sites in the same diff; a green build compiles every
  dashboard route that renders these dialogs.

### Readability — *recover the why*
- Every non-obvious decision has its **why** captured above: the two chosen type-dialog
  descriptions, the create-mode-only `headerExtra` ternary, the `edit-user` no-mode-switch
  reconciliation, the rich-JSX-description flattening, the dropped `Gift` icon, and the
  `!isControlled` trigger guard for `new-operating-cost`. The `FormDialog` prop contract is
  evident from its typed interface and the inline doc-comments on `headerExtra`, `canSubmit`,
  `contentClassName`, and `footer` (copied verbatim from the approved design).
- Names match behavior (`FormDialog`, `headerExtra`, `canSubmit`, `submittingLabel`). No
  dead code, no commented-out blocks: removed the now-unused imports surfaced by lint
  (`Button` in `edit-user`/`branch-sync-settings`, the raw `Dialog*` primitives across all
  files, the `DialogTitle`-from-radix in the two type dialogs, `Gift` in `reward-expense`).
  Lint is green, so no unused-import or style finding remains.

### Reliability — *right answer for in-contract inputs*
- `FormDialog`'s footer logic is exhaustive over its inputs: `footer ?? default` cleanly
  partitions custom-footer vs default-footer dialogs; the default submit disables on exactly
  `isSubmitting || !canSubmit` and the cancel on `isSubmitting`; the label switches on
  `isSubmitting`. Each retrofit passes the same boolean expressions the original used
  (`isValid`/`isDirty` → `canSubmit`, `isPending` → `isSubmitting`), so the enabled/disabled
  and label behavior is unchanged for every in-contract state.
- Mode-dependent dialogs preserve the exact conditional strings (verified line-by-line
  against each pre-refactor file). The two normalized type dialogs keep `!isValid || isPending`
  mapped to `!canSubmit || isSubmitting` — identical disable semantics. `edit-bank-account`'s
  inline `onSubmit={handleSubmit((values) => mutate(values as Values))}` was moved as-is to
  the `onSubmit` prop, so submission still runs the same validated handler.
- Determinism: no iteration-order, clock, locale, or randomness dependency was introduced;
  the flattened description strings are pure functions of the same source values the JSX
  read. A clean re-render is idempotent (no state mutation in `FormDialog`).

### Resilience — *fails safe when the world breaks*
- No new external calls, FS, locks, subprocesses, or on-disk state — every change is
  React render-layer. All existing mutation/error handling (`onError` toasts via `mapError`
  or `error.message`, `isPending` guards) is untouched and still wraps each form's submit.
- The dialog open/close lifecycle is preserved: `onOpenChange` is threaded through unchanged,
  including the custom handlers in `new-invoice` (close → `handleClose`) and `new-operating-cost`
  (controlled vs internal open). A cancel via `onOpenChange(false)` cannot strand the dialog —
  it routes through the same close path the originals used.
- Motion lives entirely in the shared `dialog.tsx` primitive (enter/exit `animate-*`
  utilities behind Radix `data-[state=*]`, compositor-friendly `opacity`/`transform`,
  honoring `prefers-reduced-motion`); `FormDialog` adds no new animation, so no reduced-motion
  or jank regression. No interrupted-write or partial-state path exists in this UI-only diff.

## Final verify output

```
$ npm run lint
> eslint
(clean — exit 0)

$ npm run typecheck
> tsc --noEmit
(clean — exit 0)

$ npm run build
> next build
✓ Compiled successfully in 8.6s — all dashboard routes built
(exit 0)

$ npx reins verify --changed
Reins verify
  ✓ lint          npm run lint  7.3s
  ∘ unit          no command configured
  ✓ security      deps: no vulnerabilities >= high; secrets: no secrets found  1.3s
  ✓ design        12 advisory slop tell(s)  55ms
  ✓ feature-list  16 feature(s), 1 active, 1 in progress  5ms
  ✓ traceability  every requirement maps to a task  8ms

Result: PASS
```

> All 12 design advisories are pre-existing glassmorphism tells in
> `src/components/dashboard/{business-widgets,chart-area-interactive,dashboard-hero}.tsx`
> — none originate from `form-dialog.tsx` or any of the 22 retrofitted dialogs.

## Handoff

Not marking `done`. Requesting the reviewer. **Note for the leader:** the working tree
carries pre-existing uncommitted changes from prior features (page.tsx files, dashboard
components, globals.css, etc.) that are out of this feature's scope — my changed set is the
22 dialog files + the new `src/components/ui/form-dialog.tsx` (23 files), verified isolated.
After `APPROVED`, set `form-dialog` to `done` and move this summary into
`progress/history.md`.
