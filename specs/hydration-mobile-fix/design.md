# Design — hydration-mobile-fix

## File to touch

| File | Change |
|------|--------|
| `src/hooks/use-mobile.ts` | Full internal rewrite; public API (`useIsMobile`) unchanged. |

No other source files are modified. The 17 consumers, markup, and types remain as-is.

## Implementation

### Constant (unchanged)

```ts
const MOBILE_BREAKPOINT = 768
```

### MediaQueryList instance (module-level singleton)

Create the `MediaQueryList` once at module evaluation time on the client.
On the server (where `window` is not defined) the variable is `null`; the
`getServerSnapshot` branch handles that case.

```ts
// Created once; null on the server.
const mql =
  typeof window !== "undefined"
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    : null
```

Using a module-level singleton avoids re-creating the `MediaQueryList` on
every render and ensures a single subscription per document.

### subscribe function

```ts
function subscribe(callback: () => void): () => void {
  if (!mql) return () => {}
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}
```

### getSnapshot (client)

```ts
function getSnapshot(): boolean {
  return mql ? mql.matches : false
}
```

### getServerSnapshot

```ts
function getServerSnapshot(): boolean {
  return false
}
```

### Hook

```ts
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

The return type is `boolean` — identical to the current public contract.

## Data shapes

No new types are introduced. The hook signature before and after:

```ts
// Before (implicit — !!isMobile where isMobile: boolean | undefined)
useIsMobile(): boolean

// After (explicit)
useIsMobile(): boolean
```

## No-test-runner note

The project has `"test": null` in `reins.config.json` and no Vitest or Jest
configuration in `package.json` or the project root. The verify gate does not
run a unit check. Tests described in `tasks.md` are written as Vitest spec
files (the most natural fit for a Next.js/React 19 project); they are
**described but skippable** under the current gate. When a test runner is
configured, these files can be executed without modification.

## Rejected alternative — Option C (lazy `useState` initializer)

Initialize state by reading `window.matchMedia` inside the `useState` initializer
with a guard (`typeof window !== "undefined"`), then keep the existing `useEffect`
for subsequent updates.

**Why rejected:** This approach still relies on a `useEffect` for subscription
management, which means the value can still flip after mount if the initializer
races with server rendering. It also retains the `undefined` intermediate state
pathway (the initializer only avoids it when `window` exists at evaluation time,
which is not guaranteed in all SSR/streaming scenarios). `useSyncExternalStore`
is the API specifically designed for this problem in React 18+; it provides
React-controlled tearing prevention and a first-class server-snapshot contract,
whereas a lazy initializer + effect is a hand-rolled approximation with known
edge cases.
