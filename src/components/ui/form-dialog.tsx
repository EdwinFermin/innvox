"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  // Dialog open state
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Header
  title: string;
  description?: string;
  /** Node rendered inside <DialogHeader> after the title/description group.
   *  Used by dialogs that place UI (e.g. a receipt-upload button) in the header. */
  headerExtra?: React.ReactNode;

  // Form submission
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isSubmitting: boolean;
  /** Covers both isValid (most dialogs) and isDirty (branch-sync-settings). */
  canSubmit: boolean;
  submitLabel: string;
  /** Defaults to "Guardando…" */
  submittingLabel?: string;
  /** Defaults to "Cancelar" */
  cancelLabel?: string;

  // Layout / trigger
  /** When provided, renders <DialogTrigger asChild>{trigger}</DialogTrigger>. */
  trigger?: React.ReactNode;
  /** Appended to the default "dashboard-dialog-content" className.
   *  Use for per-dialog max-width: "max-w-sm", "max-w-lg", "max-w-2xl", etc. */
  contentClassName?: string;

  // Escape hatch: when provided, REPLACES the default Cancelar+Submit footer.
  footer?: React.ReactNode;

  children: React.ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  headerExtra,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitLabel,
  submittingLabel = "Guardando…",
  cancelLabel = "Cancelar",
  trigger,
  contentClassName,
  footer,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn("dashboard-dialog-content", contentClassName)}
      >
        <DialogHeader className="dashboard-dialog-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="max-w-2xl leading-6">
                  {description}
                </DialogDescription>
              )}
            </div>
            {headerExtra}
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">{children}</div>

          {footer ?? (
            <DialogFooter className="dashboard-dialog-footer">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                className="rounded-2xl"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
