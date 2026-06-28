"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ErrorStateProps {
  /** Primary heading, e.g. "Algo salió mal" */
  title: string
  /** Supporting body text */
  description: string
  /** If provided, renders a "Reintentar" <button> that calls this on click */
  onRetry?: () => void
  /** If true, renders a "Volver al inicio" <a href="/"> link */
  showHomeLink?: boolean
  /** Shown only when process.env.NODE_ENV === "development" */
  technicalDetail?: string
  className?: string
}

/**
 * Presentational fallback for error boundaries and the 404 page. Pure UI:
 * it owns no error-handling logic, only the structured display of a recovery
 * surface (title, description, optional retry/home actions, dev-only detail).
 *
 * Motion is gated behind `motion-safe:` so a `prefers-reduced-motion: reduce`
 * browser gets an instant, animation-free render. Only `opacity` and
 * `transform` are animated (compositor-friendly, no layout jank).
 */
export function ErrorState({
  title,
  description,
  onRetry,
  showHomeLink,
  technicalDetail,
  className,
}: ErrorStateProps) {
  // The detail string is only meaningful to a developer; it is gated at the
  // call site too, but we double-gate here so the component never leaks
  // internals if a caller forgets the environment check.
  const showTechnicalDetail =
    Boolean(technicalDetail) && process.env.NODE_ENV === "development"

  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-xl border bg-card px-6 py-10 text-center text-card-foreground shadow-sm",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle aria-hidden="true" className="size-6" />
      </span>

      <div className="space-y-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {showTechnicalDetail ? (
        <pre className="w-full overflow-x-auto rounded-md border bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">
          {technicalDetail}
        </pre>
      ) : null}

      {onRetry || showHomeLink ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {onRetry ? (
            <Button onClick={onRetry}>Reintentar</Button>
          ) : null}
          {showHomeLink ? (
            <Button asChild variant={onRetry ? "outline" : "default"}>
              <Link href="/">Volver al inicio</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
