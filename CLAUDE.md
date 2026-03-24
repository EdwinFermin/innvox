# CLAUDE.md — Agent Behavior

## Context discipline

1. Read `docs/app-overview.md` first for product and structure context.
2. Use targeted `glob`/`grep` — never scan the full repo.
3. Max 10 files per context window. Prefer snippets over full files.
4. For schema or RPC tasks, inspect `supabase/migrations/001_initial_schema.sql` early.
5. Reference implementations are in `payables/` (CRUD) and `reports/cuadre-del-dia/` (reports).

## Planning

- For non-trivial changes (3+ files, new features, architectural decisions): plan first, then implement.
- Plans should list: files to touch, the approach, and risks.
- For simple fixes (typo, one-file change): skip planning, just do it.
- When multiple valid approaches exist, present options with tradeoffs — don't pick silently.

## Communication

- Be concise. Lead with the action or answer, not the reasoning.
- Use Spanish for domain terms that the codebase already uses (NCF, cuadre, DGII, sucursal).
- English for all code, comments, commit messages, and PR descriptions.
- When explaining changes, reference file paths with line numbers (`src/actions/payables.ts:42`).
- Don't repeat what was asked — just do it.

## Making changes

- Follow existing patterns. Before creating something new, find a similar existing module and mirror it.
- One concern per file. Don't mix unrelated changes.
- Don't refactor code that wasn't asked to be changed.
- Don't add comments, docstrings, or type annotations to untouched code.
- Don't add error handling for impossible scenarios.
- Prefer editing existing files over creating new ones.
- When creating new business modules, follow the standard pattern: page → dialog → hook → action → type.

## Tools & commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

- Run `npm run typecheck` after changes that modify types or interfaces.
- Run `npm run lint` after adding new files or changing imports.
- Run `npm run build` when asked to verify the build, or before PRs.

## Formatting changes

- Keep diffs minimal. Don't reformat code you didn't change.
- Respect existing indentation and style in each file.
- Don't change import order unless adding/removing imports.

## Migrations

- Never modify existing migration files.
- New migrations get the next sequential number: `NNN_description.sql`.
- Include both the DDL and any RPC function updates in the same migration when they're related.
- Always add `IF NOT EXISTS` / `CREATE OR REPLACE` where applicable.

## Git workflow

- After a PR is merged (or before starting a new implementation), always switch to `main` and pull: `git checkout main && git pull origin main`.
- Create a new feature branch from the updated `main` before making changes.
- Never continue working on a merged or stale branch.

## What NOT to do

- Don't run `npm install` without asking first.
- Don't create README, docs, or markdown files unless asked.
- Don't add testing infrastructure unless asked.
- Don't introduce new dependencies without discussing first.
- Don't commit or push unless explicitly asked.
