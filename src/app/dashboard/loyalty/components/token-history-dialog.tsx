"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { Client } from "@/types/client.types";
import { useTokenHistory } from "@/hooks/use-loyalty";

type TokenHistoryDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const eventTypeLabels: Record<string, string> = {
  manual: "Manual",
  scan: "Escaneo",
  reset: "Recompensa",
  registration: "Registro",
};

export function TokenHistoryDialog({
  client,
  open,
  onOpenChange,
}: TokenHistoryDialogProps) {
  const { data: events, isLoading } = useTokenHistory(
    open && client ? client.id : "",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog-content max-h-[80vh] max-w-lg w-[calc(100vw-2rem)] overflow-y-auto">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Historial de tokens
          </DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            {client?.name} ({client?.po_box})
          </DialogDescription>
        </DialogHeader>

        <div className="dashboard-dialog-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <SpinnerLabel label="Cargando historial..." />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-muted/60 p-6 text-center text-sm text-muted-foreground">
              No hay eventos registrados para este cliente.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          event.event_type === "reset"
                            ? "bg-amber-100 text-amber-800"
                            : event.delta > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                        }`}
                      >
                        {event.delta > 0 ? `+${event.delta}` : event.delta}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {eventTypeLabels[event.event_type] ?? event.event_type}
                      </span>
                    </div>
                    {event.note && (
                      <p className="truncate text-xs text-muted-foreground">
                        {event.note}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-medium">
                      {event.tokens_after}/10
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), "d MMM yyyy, HH:mm", {
                        locale: es,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
