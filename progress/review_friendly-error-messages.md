# Review — friendly-error-messages
Verdict: APPROVED

## Checkpoints

- C1: [x] — Harness files present (`reins doctor` implicitly confirmed by `npx reins verify` PASS).
- C2: [x] — Exactly one feature `in_progress` (`friendly-error-messages`); all states valid.
- C3: [x] — `npx reins verify` lint gate green.
- C4: [x] — `test: null` in `reins.config.json`; unit gate shows `∘ unit — no command configured`. Per stated test-contract context, traceability table in `specs/friendly-error-messages/tasks.md` satisfies this checkpoint.
- C5: [x] — `npx reins verify` security gate green: 0 vulnerabilities >= high, no secrets found. No new runtime dependencies.
- C6: [x] — `npx reins verify` design gate green at `failOn: block` threshold (21 advisory tells, zero block-severity items).
- C7: [x] — `npx reins verify` traceability gate green: every requirement R1–R13 maps to a task.
- C8: [x] — Implementation satisfies R1–R13 plus the security-hardened R6 reading. Strictly more restrictive than the original; never less correct for any in-spec input. No drive-by edits.
- C9: [ ] — `progress/history.md` not yet updated and `current.md` not reset. These are post-approval close steps; not a blocker at review time.

## Judgment (Four R's)

### Risk
The security hardening diff is contained to `src/lib/error-messages.ts` only. No call sites, routes, schemas, or on-disk state changed. Fan-in is still exactly two call sites (the same two from the first review). The change is strictly additive in the security direction — it tightens, never loosens, the boundary. `page.tsx` `throw error;` re-throw is unchanged. No reversibility artifact is owed (purely additive leaf module, no public API contract altered). [advisory] — Blast radius remains minimal; no block finding.

### Readability
All name changes are accurate. `looksLikeRawDb` (lines 97–102) correctly describes the broadened detector (marker substring OR action-wrapper prefix); the old `containsRawDbMarker` would have been a lie after adding the regex branch. `ACTION_WRAPPER_RE` name is accurate and its regex `/^error al .+?: /` (case-insensitive via `.toLowerCase()` preprocessing) is explained by the comment at line 76–80. The comment block at lines 9–20 captures the SEC-1 rationale for fail-closed posture — the non-obvious design decision whose why is captured inline. The `Object.hasOwn` comment at line 157–159 explains the prototype-chain concern. No dead code, no commented-out blocks. [advisory] — No block finding; intent is recoverable from diff and comments.

### Reliability
All in-contract inputs from R1–R13 remain correctly handled:
- R1/R2/R3: PostgrestError with codes `23505`/`23503`/`42501` → `Object.hasOwn(CODE_MAP, code)` lookup (line 160). `Object.hasOwn` is equivalent to `Object.prototype.hasOwnProperty.call` and correct for a plain object literal. No regression.
- R4: `Error` with "row-level-security" → `looksLikeRawDb` catches the marker, `mapRawMessage` routes to `PERMISSION_MESSAGE` (line 126). Correct. The new "permission denied" branch at line 127 is additive; `row-level-security` still matches.
- R5: `TypeError` with "fetch" in message → `looksLikeRawDb` catches "fetch", `mapRawMessage` returns `NETWORK_MESSAGE` (line 131). Correct.
- R6: Friendly `Error` message with no marker and no action-wrapper prefix (e.g. `"Selecciona una fecha."`) → `looksLikeRawDb` returns false → pass through unchanged (line 175). R6 intent is preserved. All known action throws use the Spanish "Error al …: " wrapper caught by `ACTION_WRAPPER_RE`, so no friendly message is accidentally captured.
- R7: Action-throw concatenation (e.g. `"Error al crear la cuenta por pagar: duplicate key value…"`) → `ACTION_WRAPPER_RE` matches in `looksLikeRawDb` → `mapRawMessage` returns specific message (`CODE_MAP["23505"]` via "duplicate key" branch). Correct; the wrapper regex fires before the marker scan, but both paths produce the same `mapRawMessage` call.
- R8: null/undefined/number/plain object → fallthrough to `return GENERIC_MESSAGE` (line 183). Unchanged.
- R9: Error with a DB-origin marker but no specific mapping (e.g. "numeric field overflow") → `looksLikeRawDb` fires, `mapRawMessage` exhausts all branches, returns `GENERIC_MESSAGE` (line 137). Correct.
- R10: outer `try/catch` at lines 148/184 still wraps the entire body, including the new `ACTION_WRAPPER_RE.test()` call and all `looksLikeRawDb`/`mapRawMessage` logic. A regex `.test()` on a string never throws; `.includes()` on strings never throws. R10 holds unconditionally.
- PostgrestError with unmapped code: previously passed through verbatim if no marker present (the original R6 path); now always calls `mapRawMessage` (line 166) — map-or-generic, never raw. This is the security hardening and is correct per SEC-1. No in-spec requirement is violated: R6 is scoped to `Error` instances, not PostgrestError-shaped objects.

[advisory] — The expanded `RAW_DB_MARKERS` list includes "does not exist" and "syntax error", which are generic English phrases that could theoretically appear in a hand-crafted friendly error message. In this codebase all action throws use the Spanish "Error al …: " prefix, so `ACTION_WRAPPER_RE` would catch them first; standalone friendly messages are in Spanish and would not contain these English substrings. The risk of a false positive is vanishingly small given the codebase conventions, but the concern is noted.

### Resilience
`mapError` is unchanged as the UI's resilience boundary. The outer `try/catch` (lines 148/184) still guarantees no throw for any input including circular references or exotic getters. `ACTION_WRAPPER_RE` is a pre-compiled module-level constant — no per-call construction, no runtime allocation that could fail. `looksLikeRawDb` is pure (no external calls, no state). `Object.hasOwn` is standard ES2022, available in the project's target environments. No resources acquired, no on-disk writes. [advisory] — No block finding; fault containment remains thorough.

## Changes required

None. `npx reins verify` is green. All requirements R1–R13 are correctly implemented in the updated diff. The security hardening is architecturally sound and does not introduce any block-severity Four R's finding.
