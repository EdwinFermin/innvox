# Design — motion-polish

## Files to touch

| File | Change |
| --- | --- |
| `src/app/globals.css` | Append a `@media (prefers-reduced-motion: reduce)` block after all `@layer` declarations that zeroes animation/transition durations app-wide (R1). |
| `src/app/dashboard/payables/page.tsx` | Wrap the `dashboard-table-frame` div in a conditional class that applies the content-settle animation when `!isLoading` (R2, R4, R5, R6). |
| `src/app/dashboard/reports/cuadre-del-dia/page.tsx` | Apply the same content-settle animation class to the movement-table `Card` when `!isLoading` (R3, R4, R5, R6). |

## Approach

1. **globals.css — reduced-motion safeguard (R1)**

   Append the following block verbatim after the existing `@media print` blocks, as the last rule
   in the file. Placing it last ensures it overrides any animation utilities from `tw-animate-css`
   or `@layer components` without needing a specificity hack beyond `!important`:

   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

2. **Content-settle animation vocabulary (R2, R3, R4)**

   Use Tailwind's `motion-safe:` variant combined with `tw-animate-css`'s `animate-in`, `fade-in`,
   and `slide-in-from-bottom-2` utilities, plus a `duration-200` modifier. This produces a 200ms
   ease-out opacity + small translateY entry that is automatically suppressed when
   `prefers-reduced-motion: reduce` is active (via the `motion-safe:` prefix, which maps to
   `@media (prefers-reduced-motion: no-preference)`).

   Exact class string to apply to the content container when `!isLoading`:

   ```
   motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200
   ```

   This is conditional: the classes are only added after `isLoading` becomes `false`. To avoid
   re-triggering the animation on filter/sort re-renders (which do not change `isLoading`), the
   classes are applied via a one-shot `key` prop or a stable `isLoaded` boolean derived from
   `isLoading` using `React.useState` + `React.useEffect` — set to `true` the first time
   `isLoading` is `false` and never reset. This means the animation runs exactly once per page
   mount (when data first arrives), not on every query refetch.

   Concretely for each page:

   ```tsx
   // Derive a stable isLoaded flag (runs once; never resets to false)
   const [isLoaded, setIsLoaded] = React.useState(false);
   React.useEffect(() => {
     if (!isLoading) setIsLoaded(true);
   }, [isLoading]);

   // Apply settle classes to the content wrapper once loaded
   const settleClass = isLoaded
     ? "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
     : "";
   ```

   In `payables/page.tsx`, `settleClass` is added to the `dashboard-table-frame` div's className.
   In `cuadre-del-dia/page.tsx`, `settleClass` is added to the movement-table `Card`'s className.
   No other elements receive this class.

3. **No changes to ErrorState or EmptyState** — this feature only confirms vocabulary coherence;
   those components are owned by their respective features and must not be touched here.

## Signatures / data shapes

No new exported functions, hooks, or types are introduced. The only new symbols are local
`isLoaded` state variables and `settleClass` derived strings, scoped entirely within each page
component. The CSS addition in `globals.css` introduces no new selectors beyond the media query.

## Rejected alternative

**CSS Modules / inline keyframe animation** — using a dedicated `@keyframes` block and a CSS
module class for the content settle was considered. It would give full control over the animation
curve without relying on `tw-animate-css`. Rejected because `tw-animate-css` is already imported
and provides the exact primitives needed (`animate-in`, `fade-in`, `slide-in-from-bottom-*`,
`duration-*`), adding a CSS module would introduce a new file and a new pattern for a single
use-case, and the Tailwind `motion-safe:` variant already provides the required reduced-motion
gate without any extra code. Keeping everything in Tailwind class strings stays consistent with
how the rest of the UI is styled.
