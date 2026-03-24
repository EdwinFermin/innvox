"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { adjustTokens } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Client } from "@/types/client.types";
import { TokenDots } from "./token-dots";

type AdjustTokensDialogProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdjustTokensDialog({
  client,
  open,
  onOpenChange,
}: AdjustTokensDialogProps) {
  const [note, setNote] = React.useState("");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (delta: number) => {
      if (!client) return;
      return adjustTokens(client.id, delta, "manual", note || undefined);
    },
    onSuccess: (result) => {
      if (!result) return;
      queryClient.invalidateQueries({ queryKey: ["loyalty-clients"] });

      if (result.was_reset) {
        toast.success("Tarjeta completa! Recompensa otorgada.");
      } else {
        toast.success("Tokens actualizados");
      }

      setNote("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al ajustar tokens",
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog-content max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Ajustar tokens
          </DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            {client?.name} ({client?.po_box})
          </DialogDescription>
        </DialogHeader>

        <div className="dashboard-dialog-body">
          <div className="dashboard-form-card space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-[1.2rem] border border-border/70 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Tokens actuales
              </p>
              <TokenDots tokens={client?.tokens ?? 0} size="lg" />
              <p className="text-2xl font-semibold tracking-tight">
                {client?.tokens ?? 0} / 8
              </p>
            </div>

            <div className="dashboard-field">
              <label className="dashboard-field-label">Nota (opcional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Razon del ajuste..."
                className="h-11 rounded-2xl border-border/70 bg-background"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="h-11 rounded-2xl"
            disabled={addMutation.isPending || (client?.tokens ?? 0) <= 0}
            onClick={() => addMutation.mutate(-1)}
          >
            <Minus className="mr-2 h-4 w-4" />
            Quitar token
          </Button>
          <Button
            className="h-11 rounded-2xl"
            disabled={addMutation.isPending}
            onClick={() => addMutation.mutate(1)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
