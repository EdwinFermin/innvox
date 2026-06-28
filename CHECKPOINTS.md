# Checkpoints

Objective criteria the `reviewer` walks before approving. Each maps to an executable check — run `npx reins verify` and `reins doctor` to evaluate them mechanically.

- **C1 — Harness intact.** All base files present (`.claude/agents/*`, `docs/*`, `feature_list.json`, `progress/`). → `reins doctor`
- **C2 — Coherent state.** At most one feature `in_progress`; states are valid. → `npx reins verify --only feature-list`
- **C3 — Lint clean.** Code matches `docs/conventions.md`. → `npx reins verify --only lint`
- **C4 — Tests green.** Every changed behavior has a passing test. → `npx reins verify --only unit`
- **C5 — Security clean.** No leaked secrets; dependency audit passes the configured threshold. → `npx reins verify --only security`
- **C6 — Design clean** *(UI changes only).* No block-severity "AI slop" tells; the deterministic scan passes at the configured severity. Skips automatically when no UI files changed. → `npx reins verify --only design`
- **C7 — Traceability.** Every requirement `R<n>` maps to a test. → `npx reins verify --only traceability`
- **C8 — Spec respected.** The implementation does what the approved spec says, no more.
- **C9 — Session closed well.** `progress/history.md` updated; no stray artifacts; `current.md` reset.

A checkpoint that cannot be ticked blocks approval.

Above these mechanical checks sits the **Four R's** (Risk, Readability, Reliability, Resilience — see `docs/four-rs.md`): the qualitative judgment the reviewer applies to interpret what a green C1–C9 does **not** prove. They are severity-driven (a *block*-severity finding warrants `CHANGES_REQUESTED`), never ticked as checkpoints here.

For UI-touching changes, **C6** is only the mechanical floor; the **`design-reviewer`** applies the qualitative depth above it — `docs/design.md` (anti-"AI slop", design-system fidelity, accessibility) and `docs/motion.md` — likewise severity-driven (a *block* finding warrants `DESIGN_BLOCK`).
