"use client"

import { ErrorState } from "@/components/ui/error-state"

/**
 * Root crash fallback. Next.js renders this only when the root layout itself
 * throws, which means no `ThemeProvider` or app chrome is available — so this
 * file ships its own `<html>`/`<body>` document. The body carries the
 * design-system token classes (`bg-background text-foreground`) so the CSS
 * custom properties still resolve without any React context provider. Because
 * `next-themes` is absent here, the `<head>` script below re-applies the `.dark`
 * class synchronously so a dark-mode user still gets the dark token values.
 */
export default function GlobalError({
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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/*
         * This document renders outside next-themes/ClientRoot (the root layout
         * crashed), so the `.dark` class that next-themes normally sets on <html>
         * is never applied — every `.dark`-scoped token in globals.css would
         * otherwise fall back to its light `:root` value. This blocking script
         * re-applies the theme synchronously before first paint, mirroring
         * next-themes' own anti-flash technique: read its storage key ("theme",
         * attribute="class", defaultTheme="system" per ClientRoot) and resolve
         * "system" against the OS preference. Vanilla JS in a <script> tag — no
         * React context, no new dependency (R12). try/catch guards private-mode
         * localStorage access failures.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme')||'system';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()",
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <main className="flex min-h-screen items-center justify-center p-6">
          <ErrorState
            title="Algo salió mal"
            description="Ocurrió un error inesperado. Intenta de nuevo."
            onRetry={reset}
            showHomeLink
            technicalDetail={technicalDetail}
          />
        </main>
      </body>
    </html>
  )
}
