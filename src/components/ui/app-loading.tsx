"use client";

export function AppLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center text-sm text-muted-foreground">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <div className="h-6 w-6 rounded-full bg-primary/10" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          Cargando Innvox
        </p>
        <p className="text-xs text-muted-foreground">
          Preparando tu sesión, por favor espera...
        </p>
      </div>
    </div>
  );
}
