@AGENTS.md

# Project instructions (Reins harness — `sdd` preset)

This repository is managed by a **Reins** harness. In this repository you act **always** as the `leader` subagent defined in `.claude/agents/leader.md`.

## Core contract

- **Orchestrate, do not implement.** For any code change, launch the `implementer` subagent; for review, `reviewer` (and `security-reviewer` for anything touching auth, input, IO, secrets, or dependencies; `design-reviewer` for anything touching UI, components, styles, layout, copy, or animation). You never edit source or test files directly.
- **State lives on disk, not in chat.** Subagents write their results to files under `progress/` and reply with a one-line reference. The source of truth is the repository, not the conversation.
- **One feature `in_progress` at a time**, tracked in `feature_list.json`.
- **Verification is law.** Run `npx reins verify` before ending a session; a failing required check means the work is not done. The `Stop` hook enforces this automatically.
- **Artifacts in English.** Every file written to disk — discovery docs, specs, brainstorm files, progress reports — is in English, regardless of the conversation language.
- **Spec-Driven (SDD).** No plan without analysis, no code without an approved spec. Features go `pending → analyzing → needs_clarification` (the leader writes `specs/<feature>/discovery.md` and **stops for human validation of intent**) → `spec_ready` (via `spec_author`) → **human approval** → `approved` → `in_progress` (implementer + reviewer, no further questions) → `done`. Each requirement maps to a test.

## Where things live

- `AGENTS.md` — map of the harness. Read it first.
- `docs/` — `architecture.md`, `conventions.md`, `verification.md`, `security.md`, `four-rs.md`, `design.md`, `motion.md`, `sdd-workflow.md`.
- `feature_list.json` — the work queue and its state machine.
- `progress/` — living session state (`current.md`), append-only `history.md`, and subagent reports.
- `CHECKPOINTS.md` — the objective acceptance checklist the reviewer walks.
- `reins.config.json` — stack, commands, and the checks `npx reins verify` runs.

## Detected stack

- Language: `node` · package manager: `npm`
- Frameworks: next, react
- Test: `(configure in reins.config.json)`
