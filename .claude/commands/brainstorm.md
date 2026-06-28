---
description: Decompose a rough idea into a sequence of discrete features and walk every feature to an approved spec (epic-level brainstorm).
argument-hint: "<your idea>"
allowed-tools: Read, Write, Edit, Bash, Agent
---

Acting as the `leader`, help the human turn a rough idea into a sequence of small, shippable features. The idea is in `$ARGUMENTS` — if it is empty, ask the human to describe what they want to build before going further. You are **planning only**: you do not write product code here, and you do not touch `feature_list.json` until the human approves.

1. **Understand the idea.** Read `AGENTS.md` and skim the relevant parts of the codebase. Ask the human any clarifying questions you need. For a large or unfamiliar area, launch `Explore` subagents so the breakdown is grounded in what actually exists — don't guess the architecture. Explorers are read-only and disposable: launch them cheap (e.g. `model: haiku`, low effort) — their output is summarized findings, not code.

2. **Decompose.** Break the idea into discrete features, each small enough to flow through the harness one at a time. Choose an `<epic-slug>` for the whole idea and a `slug` for each feature — all matching `^[a-z0-9][a-z0-9-]*$`. For every feature capture a one-line title, a one-line rationale, its `dependsOn` (other slugs in this batch), and where it sits in the recommended order.

3. **Write the breakdown to disk** at `progress/brainstorm_<epic-slug>.md` *before* you stop, so the proposal survives even if the conversation is later compacted. Use this shape:

   ```
   # Brainstorm — <epic-slug>

   ## Idea
   <the human's idea, as you understand it>

   ## Proposed features
   | # | slug | title | depends on | why |
   | - | ---- | ----- | ---------- | --- |
   | 1 | <slug> | <title> | — | <rationale> |
   | 2 | <slug> | <title> | <slug> | <rationale> |

   ## Open questions
   - <anything the human still needs to decide>

   ## Resolution
   <filled in after approval: the features actually registered>
   ```

4. **Present the breakdown and stop.** Show the human the proposed features and the order, and **wait for their approval in chat**. If they want changes, revise the list and the file. Register nothing yet.

5. **On approval, register the features** as `pending`, in dependency-first order (a feature's dependencies before the feature itself), by running for each one:

   ```
   reins add-feature <slug> --title "<title>" --depends-on <a,b> --json
   ```

   Do **not** pass `--with-spec`. The command dedupes by slug, so re-running is safe; report which features were added and which were skipped.

6. **Spec pipeline — run it now, feature by feature.** This is where the human settles every detail, so that implementation later needs **no further questions or approvals**. Process the registered features **in dependency order, strictly one at a time** — a feature must reach `approved` before the next one leaves `pending` (`verify` allows only one `analyzing`). For each feature:

   1. Set it `analyzing` in `feature_list.json`. Investigate the codebase yourself — read the relevant files, launch explorers for anything non-trivial. Copy `specs/_template/discovery.md` to `specs/<slug>/discovery.md` and fill it: findings, affected areas, approaches, and the **open questions** the human must answer. Set the feature `needs_clarification`.
   2. Present **that feature's open questions in chat** and wait for the human's answers. Record the answers in the discovery's **Resolution** section.
   3. Launch `spec_author` to write `requirements.md`, `design.md`, and `tasks.md` grounded in the resolved discovery — never in the bare title. It sets the feature `spec_ready`.
   4. Present a short summary of the spec in chat and ask for approval. On approval, set the feature `approved`. If the human requests changes, revise the discovery/spec and re-present — never advance an unapproved feature.
   5. Move on to the next feature.

   If this loop is interrupted, resume each feature from its current state (`analyzing`/`needs_clarification` → finish the Q&A; `spec_ready` → present for approval), or use `/validate-discovery <feature>` and `/approve-spec <feature>` individually.

7. **Close the loop.** Record the final feature list in the **Resolution** section of `progress/brainstorm_<epic-slug>.md`, run `npx reins verify` to confirm a green tree, then tell the human: every feature is `approved` — from here, `/next-feature` implements them one at a time with **no further questions or approvals**.

Remember: brainstorm registers features and carries each one to `approved` — it never sets a feature `in_progress`, and all human questioning belongs here, not during implementation. Write every file you save (`progress/brainstorm_*.md`, discoveries, specs) in English, even if this conversation is in another language.
