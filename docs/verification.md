# Verification

> How we prove the project works. `npx reins verify` runs these as one cross-platform gate (non-zero exit on failure) and is wired into Claude Code hooks.

## Levels

1. **Lint** — `npm run lint`
2. **Unit tests** — `(configure in reins.config.json)`
3. **Type check** — `npm run typecheck`
5. **Security** — dependency audit + secret scan (`npx reins verify --only security`).
6. **Design** — a deterministic "AI slop" scan of UI files (`npx reins verify --only design`); skips when there are no UI files. Pairs with the `design-reviewer`'s judgment (`docs/design.md`).
7. **Feature list** — the state machine is coherent (at most one `in_progress`).
8. **Traceability** — every requirement maps to at least one test.

## Rules

- The required checks (see `reins.config.json` → `verify.required`) must pass before a feature is `done`.
- The `Stop` hook runs `npx reins verify` and blocks the session from ending on a red tree.
- Never mark a feature `done` with a failing required check.
- CI runs the same gate (`.github/workflows/reins-verify.yml`). A ghost install (`reins init --ghost`) keeps nothing in git, so there is no committed workflow — the local hooks remain the enforcement.
