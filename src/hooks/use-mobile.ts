import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Single MediaQueryList per document, created once at module evaluation.
// `null` on the server (no `window`); the `getServerSnapshot` branch covers SSR.
const mql =
  typeof window !== "undefined"
    ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    : null

function subscribe(callback: () => void): () => void {
  if (!mql) return () => {}
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return mql ? mql.matches : false
}

// Stable server snapshot so SSR and the first client render agree (no hydration mismatch).
function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
