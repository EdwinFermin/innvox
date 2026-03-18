"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const handleConfirm = React.useCallback(async () => {
    try {
      setIsPending(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  }, [onConfirm]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;
        setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent className="dashboard-dialog-content overflow-hidden p-0">
        <AlertDialogHeader className="dashboard-dialog-header">
          <AlertDialogTitle className="text-xl font-semibold tracking-[-0.03em]">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="max-w-md leading-6">{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="dashboard-dialog-footer">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="rounded-2xl" disabled={isPending}>
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            className="cursor-pointer rounded-2xl"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? "Procesando…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
