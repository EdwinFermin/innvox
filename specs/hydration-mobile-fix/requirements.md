# Requirements — hydration-mobile-fix

## Context

`useIsMobile` currently initializes state to `undefined` and resolves it inside a
`useEffect`, producing a `false → true` flip on mobile viewports after mount.
This causes a measurable layout shift (CLS) in the sidebar and every page that
uses the hook.

The resolution is to rewrite the hook internals to use `React.useSyncExternalStore`
so the client value is stable from the first render after hydration and the return
type stays `boolean` (zero consumer changes required).

## Requirements

**R1** — WHEN `useIsMobile` is called in a server-rendering context, the system
SHALL return `false` without accessing any browser API.

**R2** — WHEN `useIsMobile` is called in a client-rendering context and the
viewport width is less than 768 px, the system SHALL return `true`.

**R3** — WHEN `useIsMobile` is called in a client-rendering context and the
viewport width is 768 px or greater, the system SHALL return `false`.

**R4** — WHILE a mounted component subscribes to `useIsMobile` and the viewport
crosses the 768 px threshold (in either direction), the system SHALL update the
returned value synchronously with the next render cycle, reflecting the new match
state of `window.matchMedia("(max-width: 767px)")`.

**R5** — WHEN the component that called `useIsMobile` unmounts, the system SHALL
remove the `change` event listener previously attached to the `MediaQueryList`
object, leaving no memory or event-handler leak.

**R6** — The system SHALL expose `useIsMobile` with a return type of `boolean`
(never `boolean | undefined`), so that no existing consumer requires modification.

**R7** — The system SHALL keep the named constant `MOBILE_BREAKPOINT` equal to
`768` (integer), and the media query SHALL use `max-width: 767px`
(i.e. `MOBILE_BREAKPOINT - 1`).

**R8** — IF `React.useSyncExternalStore` is used, the system SHALL pass a
`getServerSnapshot` function that returns `false`, satisfying React's requirement
for consistent server and initial-client snapshots during SSR/hydration.

**R9** — The system SHALL introduce no new runtime dependencies; the implementation
SHALL rely solely on `React.useSyncExternalStore` (already available in React 19,
the version present in the project) and the native `window.matchMedia` browser API.

**R10** — The rewrite SHALL be confined to `src/hooks/use-mobile.ts`; no other
source file SHALL be modified as part of this feature.
