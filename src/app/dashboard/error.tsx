"use client"

import { ErrorState } from "@/components/ui/error-state"

/**
 * Dashboard segment error boundary. Next.js renders this inside the existing
 * `src/app/dashboard/layout.tsx` shell, so the sidebar and breadcrumb stay
 * visible — no `<html>`/`<body>` wrapper is needed here.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const technicalDetail =
    process.env.NODE_ENV === "development"
      ? [error.message, error.digest].filter(Boolean).join(" — ")
      : undefined

  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <ErrorState
        title="Algo salió mal"
        description="Ocurrió un error inesperado. Intenta de nuevo."
        onRetry={reset}
        showHomeLink
        technicalDetail={technicalDetail}
      />
    </div>
  )
}
