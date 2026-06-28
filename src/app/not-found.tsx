import { ErrorState } from "@/components/ui/error-state"

/**
 * 404 fallback. Next.js renders this inside the root layout for any route that
 * does not resolve. There is nothing to retry on a missing route, so the home
 * link is the only (primary) action — no `onRetry` is passed.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Página no encontrada"
        description="La página que buscas no existe o fue movida."
        showHomeLink
      />
    </main>
  )
}
