# Requirements — error-boundaries

> EARS notation. Every requirement is numbered and objectively verifiable. Each must be covered by at least one test.

## R1

WHEN `ErrorState` is rendered with a `title` prop, the system SHALL display that title text in the component's heading element.

## R2

WHEN `ErrorState` is rendered with a `description` prop, the system SHALL display that description text in the component's body text element.

## R3

WHEN `ErrorState` is rendered with an `onRetry` callback prop, the system SHALL display a button labelled "Reintentar" that invokes that callback when clicked.

## R4

IF `ErrorState` is rendered without an `onRetry` prop, THEN the system SHALL NOT render a "Reintentar" button.

## R5

WHEN `ErrorState` is rendered with `showHomeLink={true}`, the system SHALL display an anchor element pointing to "/" labelled "Volver al inicio".

## R6

IF `ErrorState` is rendered without `showHomeLink` (or with `showHomeLink={false}`), THEN the system SHALL NOT render a "Volver al inicio" link.

## R7

WHEN `ErrorState` is rendered with a `technicalDetail` prop and `process.env.NODE_ENV` equals `"development"`, the system SHALL display that technical detail text in the component's output.

## R8

WHEN `ErrorState` is rendered with a `technicalDetail` prop and `process.env.NODE_ENV` does NOT equal `"development"`, the system SHALL NOT render the `technicalDetail` text.

## R9

WHEN `ErrorState` first mounts in a browser that does NOT have `prefers-reduced-motion: reduce` set, the system SHALL apply an opacity fade-in and upward translate entry animation with a duration in the range 150–250 ms and an ease-out timing function.

## R10

WHEN `ErrorState` first mounts in a browser that HAS `prefers-reduced-motion: reduce` set, the system SHALL render without any transition or transform animation (instant display).

## R11

WHEN `ErrorState` is rendered, the system SHALL use only design-system color tokens (no hardcoded hex, `rgb()`, or `hsl()` literals) and shall use a lucide-react icon as its error indicator.

## R12

WHEN a render error is thrown anywhere inside the root Next.js document, the system SHALL display `src/app/global-error.tsx` as the fallback, which SHALL render a valid HTML document with `lang="es"` on the `<html>` element and body background and text classes drawn from design-system tokens, with no reliance on any React context provider.

## R13

WHEN `src/app/global-error.tsx` is rendered, the system SHALL display `ErrorState` with title "Algo salió mal", description "Ocurrió un error inesperado. Intenta de nuevo.", a "Reintentar" button wired to the Next.js `reset` prop, and a "Volver al inicio" link to "/".

## R14

WHEN `src/app/global-error.tsx` is rendered and `process.env.NODE_ENV` equals `"development"`, the system SHALL pass `error.message` and `error.digest` (where defined) as the `technicalDetail` prop to `ErrorState`.

## R15

WHEN a render error is thrown inside any route under `src/app/dashboard/`, the system SHALL display `src/app/dashboard/error.tsx` as the segment fallback, rendering `ErrorState` inside the existing dashboard shell (sidebar and breadcrumb remain visible).

## R16

WHEN `src/app/dashboard/error.tsx` is rendered, the system SHALL display `ErrorState` with title "Algo salió mal", description "Ocurrió un error inesperado. Intenta de nuevo.", a "Reintentar" button wired to the Next.js `reset` prop, and a "Volver al inicio" link to "/".

## R17

WHEN `src/app/dashboard/error.tsx` is rendered and `process.env.NODE_ENV` equals `"development"`, the system SHALL pass `error.message` and `error.digest` (where defined) as the `technicalDetail` prop to `ErrorState`.

## R18

WHEN a request is made for a route that does not exist, the system SHALL display `src/app/not-found.tsx` with title "Página no encontrada", description "La página que buscas no existe o fue movida.", and a "Volver al inicio" link to "/" as the primary action (no retry button).

## R19

WHEN any of the four files (`error-state.tsx`, `global-error.tsx`, `dashboard/error.tsx`, `not-found.tsx`) are rendered, the system SHALL ship no new npm dependencies beyond those already present in `package.json`.
