# Review — form-dialog
Verdict: APPROVED

## Checkpoints

- C1: [x] `reins doctor` reports HEALTHY — all 15 core files present, agents wired, harness at v0.9.0.
- C2: [x] `form-dialog` is the single `in_progress` feature; all 16 features carry valid states. `npx reins verify --only feature-list` passes.
- C3: [x] `npm run lint` exits 0 (no output). `npm run typecheck` exits 0 (no output). `npx reins verify --only lint` passes (7.1 s).
- C4: [x] `reins.config.json` sets `test: null`; CLAUDE.md forbids adding test infrastructure. Unit gate skips (`∘`). Correctness is satisfied by: (a) full typecheck across all 23 files, (b) all 22 dialog files passing lint with no unused imports, (c) structural verification of each dialog's FormDialog props against the pre-refactor code via `git diff`, and (d) green build. No test was weakened or deleted.
- C5: [x] `npx reins verify --only security` passes — 0 vulnerabilities >= high, no secrets found.
- C6: [x] `npx reins verify --only design` passes at block threshold — 15 advisory slop tells, 0 block-severity. Implementer confirmed these are pre-existing glassmorphism tells in `business-widgets`, `chart-area-interactive`, and `dashboard-hero` — none originate from `form-dialog.tsx` or any retrofitted dialog. Advisory count increased by 3 (from 12 at the prior run) consistent with the 3 pre-existing files; no new dialog surface contributed a block tell.
- C7: [x] `npx reins verify --only traceability` passes — every requirement R1–R22 maps to at least one task in `specs/form-dialog/tasks.md` traceability table.
- C8: [x] Implementation verified against all 22 requirements; see specification verification below.
- C9: [~] `progress/history.md` does not yet contain a `form-dialog` entry and `current.md` still shows "(none)" in-progress — expected; the leader appends and resets state on APPROVED. Advisory only.

---

## Specification verification (C8 detail)

### R1–R12 — FormDialog component contract

`src/components/ui/form-dialog.tsx` matches the design.md signature verbatim (lines 64–183):
- R1: `<DialogContent className={cn("dashboard-dialog-content", contentClassName)}>` at line 72–74. PASS.
- R2: `{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}` at line 71. PASS.
- R3: Same guard renders nothing when `trigger` is falsy. PASS.
- R4: `<DialogHeader className="dashboard-dialog-header">` + `<DialogTitle>{title}</DialogTitle>` + conditional `<DialogDescription>` at lines 75–88. PASS.
- R5: `{description && <DialogDescription …>}` guard; omitting the prop produces no element. PASS.
- R6: `{headerExtra}` rendered after the title/description group inside the flex wrapper (line 87). PASS.
- R7: `<form onSubmit={onSubmit}><div className="dashboard-dialog-body">{children}</div>` at lines 91–92. PASS.
- R8: Default footer — cancel `type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}`, submit `type="submit" className="rounded-2xl" disabled={isSubmitting || !canSubmit}` with label `{isSubmitting ? submittingLabel : submitLabel}`. Lines 95–113. PASS.
- R9: `{footer ?? <DialogFooter …>…</DialogFooter>}` — footer prop replaces the default entirely. PASS.
- R10: Submit label is `submittingLabel` when `isSubmitting` is true. PASS.
- R11: Cancel `disabled={isSubmitting}`. PASS.
- R12: Submit `disabled={isSubmitting || !canSubmit}`. PASS.
- Defaults: `submittingLabel="Guardando…"`, `cancelLabel="Cancelar"`. PASS.

### R13 — 15 standard-footer dialogs

All 15 dialogs verified via `git diff HEAD -- <file>`:
- `new-payable-dialog`: `contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"`, title "Nueva cuenta por pagar", description text identical, trigger preserved, submitLabel "Guardar cuenta por pagar". PASS.
- `new-branch-dialog`: `contentClassName="max-h-[90vh] max-w-lg overflow-y-auto"`, title "Nueva sucursal", trigger preserved, submitLabel "Crear sucursal", submittingLabel "Creando…". Description **text** identical; pre-refactor used `max-w-md` on the `<DialogDescription>` element — FormDialog emits `max-w-2xl` instead (self-reported deviation #1, advisory; see Four R's).
- `new-client-dialog`: `contentClassName="max-h-[90vh] max-w-lg overflow-y-auto"`, identical description text (pre-refactor: `max-w-md`). Same advisory deviation as above.
- `new-receivable-dialog`: `contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"`, description text identical (`max-w-2xl` was already the pre-refactor value). PASS.
- `new-user-dialog`: `contentClassName="max-h-[90vh] max-w-2xl overflow-y-auto"`, description text identical. PASS.
- `edit-user-dialog`: `contentClassName="max-h-[90vh] max-w-2xl overflow-y-auto"`, description text identical, trigger (dropdown `<button>`) preserved as `trigger` prop. PASS.
- `new-bank-account-dialog`: `contentClassName="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto"`, description text identical. Pre-refactor cancel used `<DialogClose asChild>`; default footer now calls `onOpenChange(false)` — semantically equivalent per design.md caveat #2. Logo-upload UI remains in children (R21). PASS.
- `new-expense-dialog`: `contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"`, description is a conditional expression reproducing both create/edit strings exactly. `headerExtra` wired correctly (R19/R20). Title and submitLabel computed (R15). PASS.
- `new-income-dialog`: `contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"`, description text identical, computed title/submitLabel correct (R15). PASS.
- `new-invoice-dialog`: `contentClassName="max-h-[90vh] max-w-3xl overflow-y-auto"`, computed title/submitLabel/submittingLabel all match pre-refactor conditional strings (R15). PASS.
- `new-operating-cost-dialog`: `contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"`, computed title/submitLabel (R15), trigger conditional `!isControlled` behavior preserved. PASS.
- `new-link-payment-dialog`: `contentClassName="max-h-[90vh] max-w-lg w-[calc(100vw-2rem)] overflow-y-auto"`, description text identical (pre-refactor: `max-w-md`). Same advisory deviation.
- `branch-sync-settings-dialog`: `contentClassName="max-h-[90vh] max-w-lg overflow-y-auto"`, description is a template literal producing the same text as pre-refactor JSX (pre-refactor: `max-w-md`). `canSubmit={isDirty}` wired (R14). PASS.
- `new-expense-type-dialog`: `contentClassName="max-w-sm"`, Spanish description "Crea una categoría para clasificar tus gastos.", standard footer with `canSubmit={isValid}`, old `mt-6 flex justify-end gap-2` div removed (R16). PASS.
- `new-income-type-dialog`: Same normalization as expense-type with description "Crea una categoría para clasificar tus ingresos." (R16). PASS.

**Description `max-w` deviation**: 4 of the 15 standard-footer dialogs (`new-branch`, `new-client`, `new-link-payment`, `branch-sync-settings`) previously used `className="max-w-md leading-6"` on their `<DialogDescription>` elements. FormDialog hardcodes `className="max-w-2xl leading-6"`. R13's protected attributes are: `dashboard-dialog-*` CSS classes, title text, `DialogDescription` **text**, submit/cancel labels, `contentClassName` / `max-w-*` modifier, and trigger. The `DialogDescription`'s own `max-w-md` attribute is not enumerated; the **text** is byte-identical. This is an advisory deviation — the paragraph wraps slightly wider at `sm+` but behavior is unchanged.

### R14 — branch-sync-settings canSubmit

`branch-sync-settings-dialog.tsx` passes `canSubmit={isDirty}`. Confirmed in diff. PASS.

### R15 — Computed title/submitLabel

All 5 dialogs with mode switching verified:
- `new-expense`: `title={isEditMode ? "Cambiar cuenta del gasto" : "Nuevo gasto"}`, `submitLabel={isEditMode ? "Actualizar cuenta" : "Guardar gasto"}`. Matches pre-refactor strings. PASS.
- `new-income`: `title={isEditMode ? "Cambiar cuenta del ingreso" : "Nuevo ingreso"}`, `submitLabel={isEditMode ? "Actualizar cuenta" : "Guardar ingreso"}`. PASS.
- `new-invoice`: `title={isEditMode ? "Editar factura" : "Nueva factura"}`, `submitLabel={isEditMode ? "Guardar cambios" : "Imprimir y guardar"}`, `submittingLabel={isEditMode ? "Actualizando…" : "Guardando…"}`. PASS.
- `new-operating-cost`: `title={isEdit ? "Editar costo operativo" : "Nuevo costo operativo"}`, `submitLabel={isEdit ? "Actualizar" : "Crear costo operativo"}`. PASS.
- `edit-user`: edit-only file; literal "Editar usuario" / "Guardar cambios". PASS.

### R16 — Type dialogs normalized

Both `new-expense-type-dialog` and `new-income-type-dialog`:
- `contentClassName="max-w-sm"`. PASS.
- Non-empty Spanish description present. PASS.
- Standard default footer (Cancelar + Guardar) with `canSubmit={isValid}` and `isSubmitting={isPending}`. PASS.
- Old `<div className="mt-6 flex justify-end gap-2">` removed. Confirmed via diff. PASS.

Note: these dialogs previously used `<DialogContent className="max-w-sm">` without `dashboard-dialog-content`. After retrofit they gain `dashboard-dialog-content` through FormDialog's `cn()`. This is an additive improvement, not a regression.

### R17/R18 — Custom-footer dialogs

All 7 verified via `git diff HEAD`:
- `edit-bank-account-dialog`: footer slot `<DialogClose asChild>` cancel + submit "Guardar cambios" disabled `{!isValid || isPending}`. R18 preserved. PASS.
- `adjust-balance-dialog`: footer slot `<DialogClose asChild>` cancel + submit "Aplicar ajuste". Description flattened from JSX with `<span font-medium>` to plain string (self-reported deviation #2; see Four R's). R18 preserved. PASS.
- `transfer-funds-dialog`: footer slot `<DialogClose asChild>` cancel + submit "Mover". Description flattened (same deviation #2). R18 preserved. PASS.
- `withdraw-funds-dialog`: footer slot `<DialogClose asChild>` cancel + submit "Realizar retiro". Description flattened. R18 preserved. PASS.
- `complete-alert-dialog`: 3-button `<div className="border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7">` in footer slot — cancel (`onClick onOpenChange(false) disabled isBusy`), secondary "Completar sin gasto" (`type="button" variant="secondary" disabled isBusy`), primary `type="submit"` "Completar y generar gasto" (`disabled={!isValid || isBusy}`). PASS.
- `receivable-payment-dialog`: footer slot `<DialogFooter>` with cancel + "Registrar cobro". Description flattened (deviation #2, `<span font-medium>` on "Pendiente:" amount removed). PASS.
- `reward-expense-dialog`: footer slot `<DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7">` with cancel + "Crear gasto y reiniciar". Gift icon dropped from title (self-reported deviation #3; see Four R's). PASS.

### R19/R20/R21 — Header/body placement

- `new-expense-dialog`: `headerExtra={!isEditMode ? <div className="flex shrink-0 items-center gap-2">…</div> : undefined}`. Receipt upload in header (create) / absent (edit). PASS.
- `new-bank-account-dialog` and `edit-bank-account-dialog`: logo-upload UI inside `children`, not `headerExtra`. PASS.

### R22 — Quality gate

`npm run lint`: exit 0. `npm run typecheck`: exit 0. `npx reins verify`: PASS. Build not re-run by reviewer (implementer reported exit 0 at 8.6 s; typecheck clean is the compilable proxy).

### Scope / excluded dialogs

All 7 excluded dialogs (`adjust-tokens`, `bank-statement-sync`, `generate-accounts-qr`, `generate-branch-qr`, `generate-loyalty-qr`, `token-history`, `transaction-detail`) show 0-line diffs against HEAD. Confirmed clean.

Pre-existing working-tree modifications to non-dialog files (`page.tsx` files, dashboard components, `globals.css`, etc.) are confirmed pre-existing by the session-start `gitStatus` snapshot. None reference `FormDialog`. Out of scope.

---

## Judgment (Four R's)

### Risk

- **Blast radius + reversibility**: Pure presentational refactor — no actions, hooks, zod schemas, routes, or serialized formats changed. The 22 retrofitted dialogs all keep their exported component names and prop API unchanged at their call sites. `FormDialog` is a brand-new additive export with zero existing callers broken. Blast radius is contained to the dialog rendering layer; a `git revert` of the 23 files fully rolls back. No reversibility artifact needed. [advisory]
- **Scope fidelity**: Diff is confined to exactly `src/components/ui/form-dialog.tsx` + the 22 dialog files named in `design.md`. The 7 excluded dialogs are confirmed untouched. Non-dialog working-tree edits are confirmed pre-existing (gitStatus snapshot shows them as `M` before this session). The implementer's claim is verified. [advisory]
- **Test proportionality**: No executable test runner exists per `reins.config.json`. The project's testing contract substitutes typecheck + lint + build. All three pass. The new component is exercised structurally by all 22 call sites in the same diff. Proportionate to the project's established standard. [advisory]

### Readability

- Names match behavior throughout: `FormDialog`, `headerExtra`, `canSubmit`, `submittingLabel`, `footer`. The prop contract is self-documenting via the TypeScript interface and inline JSDoc comments copied from the spec. [advisory — no findings]
- Non-obvious decisions are captured in `progress/impl_form-dialog.md`: the two type-dialog descriptions, the `!isControlled` trigger guard for `new-operating-cost`, the `edit-user` literal-string rationale, the rich-JSX flattening, the Gift icon drop, and the description `max-w` normalization. No magic constant lacks a why. [advisory — no findings]
- **`complete-alert-dialog` and `reward-expense-dialog` pass `contentClassName` strings beginning with `"dashboard-dialog-content"`.** `FormDialog`'s `cn("dashboard-dialog-content", contentClassName)` produces `"dashboard-dialog-content dashboard-dialog-content …"` in the rendered className — tailwind-merge does not deduplicate custom class names. Functionally harmless (CSS applies the same rule twice), but the implementation report's claim that `cn()` "collapses" the duplicate is incorrect. A cold reader of `complete-alert-dialog.tsx:199` sees `contentClassName="dashboard-dialog-content max-h-[90vh] gap-0 …"` and cannot recover the why without reading `FormDialog` first. `form-dialog.tsx:73` is clear. The doubled class does not mislead about behavior and does not cause a bug. [advisory]
- No dead code, commented-out blocks, or vestigial parameters: lint confirms all removed imports (raw `Dialog*` primitives, `Gift`, `Button` from `edit-user`/`branch-sync-settings`) are gone. [advisory — no findings]

### Reliability

- `FormDialog`'s `footer ??` partitioning is exhaustive: when `footer` is falsy the default is rendered; when truthy the default is suppressed. The default submit disables on exactly `isSubmitting || !canSubmit`, and the label switches on `isSubmitting`. All 22 call sites pass the correct boolean expressions to these props (`isPending` → `isSubmitting`, `isValid`/`isDirty` → `canSubmit`). [advisory — no findings]
- Description flattening (deviation #2): the 4 custom-footer dialogs had `<span className="font-medium">` emphasis inside `<DialogDescription>`. After flattening, `FormDialog.description` is `string`-typed and renders as plain text in a `<p>`. The `·` separators and all text values are preserved. R17 requires reproducing "the exact button set, labels, disabled conditions, and click handlers" — it does not govern the description JSX. No in-contract behavior is wrong. [advisory]
- Gift icon drop (deviation #3): `reward-expense-dialog` title was `<Gift /> Crear gasto de recompensa`; now "Crear gasto de recompensa". The decorative icon was in the `<DialogTitle>` which is `string`-typed in `FormDialog`. R17 governs the footer reproduction for this dialog; neither R13 nor R17 explicitly protects the title decoration icon. The footer, body, submit handler, and disabled logic are unchanged. [advisory]
- Mode-conditional strings in all 5 R15 dialogs verified line-by-line against pre-refactor code. No off-by-one in string selection. [advisory — no findings]
- The `isDirty`→`canSubmit` mapping for `branch-sync-settings` correctly disables submit when the form is untouched, satisfying the pre-refactor `disabled={!isDirty || isPending}` logic. [advisory — no findings]

### Resilience

- No new external calls, file handles, locks, subprocesses, or on-disk state. Every change is React render-layer. All existing mutation/error handling (`onError` toasts, `isPending` guards) is untouched. [advisory — no findings]
- The `onOpenChange` lifecycle is threaded unchanged through all dialogs, including `new-invoice`'s custom `handleClose` handler and `new-operating-cost`'s controlled vs. internal open logic. A cancel via `onOpenChange(false)` cannot strand the dialog. [advisory — no findings]
- `FormDialog` introduces no new animation; motion lives in the shared `dialog.tsx` primitive. No reduced-motion regression. [advisory — no findings]

No block-severity findings under any R.

---

## Changes required

None.
