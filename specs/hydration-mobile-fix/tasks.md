# Tasks — hydration-mobile-fix

## Traceability table

| Task | Requirement(s) | Test |
|------|----------------|------|
| [x] T1   | R1, R6, R8     | `use-mobile.test.ts` — "getServerSnapshot returns false" |
| [x] T2   | R2, R3, R6     | `use-mobile.test.ts` — "returns true when mql.matches is true", "returns false when mql.matches is false" |
| [x] T3   | R4             | `use-mobile.test.ts` — "updates when matchMedia fires change event" |
| [x] T4   | R5             | `use-mobile.test.ts` — "removeEventListener called on unmount" |
| [x] T5   | R7             | `use-mobile.test.ts` — "media query string uses MOBILE_BREAKPOINT - 1" |
| [x] T6   | R9, R10        | `npm run typecheck` + `npm run lint` pass; no new deps in package.json |

## Task descriptions

### T1 — Rewrite hook to use `React.useSyncExternalStore` with a `getServerSnapshot`

Replace the `useState` + `useEffect` body of `useIsMobile` in
`src/hooks/use-mobile.ts` with a call to `React.useSyncExternalStore`.
Pass a `getServerSnapshot` that returns `false` (no browser API access).
The function must be defined before or alongside the hook in the same file.

Verification: unit test asserts that calling `getServerSnapshot()` directly
returns `false` (boolean, not `undefined`).

### T2 — Implement `getSnapshot` reading `mql.matches` live

Add a module-level `mql` constant initialized with
`window.matchMedia("(max-width: 767px)")` (guarded by `typeof window !== "undefined"`).
Implement `getSnapshot` to return `mql.matches` (boolean) when `mql` exists,
or `false` otherwise.

Verification: unit tests mock `window.matchMedia` to return a fake MQL object
with `matches: true` and `matches: false`, then render a component using
`useIsMobile` and assert the returned value equals `mql.matches`.

### T3 — Implement `subscribe` to attach and detach the `change` listener

Implement the `subscribe(callback)` function to call
`mql.addEventListener("change", callback)` and return a cleanup function that
calls `mql.removeEventListener("change", callback)`.

Verification: unit test triggers a `change` event on the fake MQL, asserts that
the hook's return value updates to reflect the new `matches` state in the same
render cycle.

### T4 — Confirm listener cleanup on unmount

The cleanup returned by `subscribe` is called by React when the component unmounts.
No explicit code change is needed beyond T3, but a dedicated test confirms
`removeEventListener` is called exactly once with the same callback reference
after unmount.

Verification: unit test unmounts the component and asserts that
`mql.removeEventListener` was called once with the listener callback.

### T5 — Assert breakpoint constant and query string

Confirm that `MOBILE_BREAKPOINT` equals `768` and the `MediaQueryList` is created
with the string `"(max-width: 767px)"`.

Verification: unit test spies on `window.matchMedia` and asserts it was called
with `"(max-width: 767px)"` exactly (i.e. `MOBILE_BREAKPOINT - 1`).

### T6 — Self-verify: typecheck, lint, no new dependencies

After the rewrite:
1. Run `npm run typecheck` — must exit 0.
2. Run `npm run lint` — must exit 0.
3. Confirm `package.json` is unchanged (no new entries in `dependencies` or
   `devDependencies`).

Verification: CI gate on `typecheck` and `lint` passes. Diff of `package.json`
shows no changes.

## Unit test file (described; skippable until a test runner is configured)

**Path:** `src/hooks/__tests__/use-mobile.test.ts`

**Framework:** Vitest + `@testing-library/react` (to be installed when the test
runner is wired up; the project currently has `"test": null` in `reins.config.json`
and no Vitest/Jest config).

**Test cases:**

```
describe("useIsMobile", () => {
  it("returns a boolean (never undefined) on the client")
  it("getServerSnapshot returns false without accessing window")
  it("returns true when mql.matches is true")
  it("returns false when mql.matches is false")
  it("updates synchronously when the matchMedia change event fires")
  it("calls removeEventListener with the same callback on unmount")
  it("passes '(max-width: 767px)' to window.matchMedia")
})
```

Each test mocks `window.matchMedia` via `vi.fn()` returning a controllable fake
MQL object (`{ matches, addEventListener, removeEventListener, dispatchEvent }`).
