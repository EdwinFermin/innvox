import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** A lucide-react icon component rendered inside the soft icon container. */
  icon: LucideIcon
  /** Short heading displayed below the icon. */
  title: string
  /** Supporting text displayed below the title, muted. */
  description: string
  /** Optional action element (e.g. a Button) rendered below the description. */
  action?: React.ReactNode
  /** Additional class names applied to the root wrapper. */
  className?: string
}

/**
 * Presentational empty-state for tables and cards. Pure UI: it owns no data or
 * branching logic — the caller decides when to render it. The `icon` prop is a
 * lucide-react component (not a rendered node) so the container controls sizing
 * consistently across every call site.
 *
 * Layout-neutral: the root carries no outer margin or fixed width, so it sits
 * cleanly inside a parent `<TableCell>` or `<CardContent>` without fighting it.
 *
 * Motion is gated behind `motion-safe:` so a `prefers-reduced-motion: reduce`
 * browser renders instantly with no animation. Only `opacity` and `transform`
 * are animated (compositor-friendly, no layout jank), settling over 200ms with
 * ease-out — matching the adjacent ErrorState/Skeleton surfaces.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-10 text-center",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out",
        className
      )}
    >
      <span className="bg-muted text-muted-foreground rounded-xl p-3">
        <Icon aria-hidden="true" className="size-6" />
      </span>

      <div className="space-y-1">
        <p className="text-foreground font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  )
}

export { EmptyState }
