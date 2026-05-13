"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import { useCuadreSyncs } from "@/hooks/use-cuadre-syncs";
import type { Branch } from "@/types/branch.types";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

interface LastSyncCardProps {
  userId: string;
  branches: Branch[];
}

export function LastSyncCard({ userId, branches }: LastSyncCardProps) {
  const { data: syncs, isLoading } = useCuadreSyncs(userId);
  const last = syncs[0];

  if (isLoading) {
    return (
      <div className="dashboard-panel p-4 text-sm text-muted-foreground">
        Cargando última sincronización…
      </div>
    );
  }

  if (!last) {
    return (
      <div className="dashboard-panel p-4 text-sm text-muted-foreground">
        Aún no hay sincronizaciones registradas.
      </div>
    );
  }

  const branch = branches.find((b) => b.id === last.branch_id);

  return (
    <div className="dashboard-panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Última sincronización
      </p>
      <p className="mt-1 text-lg font-semibold">
        {branch?.name ?? last.branch_id} · {format(new Date(`${last.cuadre_date}T00:00:00`), "d 'de' MMMM yyyy", { locale: es })}
      </p>
      <p className="text-sm text-muted-foreground">
        {last.transaction_count} transacción(es) ·{" "}
        {currencyFormatter.format(Number(last.total_amount))} · sincronizado{" "}
        {format(new Date(last.synced_at), "d 'de' MMM yyyy hh:mm a", { locale: es })}
      </p>
    </div>
  );
}
