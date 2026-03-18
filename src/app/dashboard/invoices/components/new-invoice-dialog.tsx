"use client";

import React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import z from "zod";

import { createInvoice } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/use-clients";
import { useConfigs } from "@/hooks/use-configs";
import { useAuthStore } from "@/store/auth";
import { Invoice } from "@/types/invoice.types";
import { generateInvoiceNumber } from "@/utils/tools";

import { ClientsCombobox } from "./clients-combobox";

const newInvoiceSchema = z.object({
  client: z.string().nonempty("El cliente es obligatorio"),
  description: z.string().min(1, "La descripcion es obligatoria").max(500, "Maximo 500 caracteres"),
  amount: z.number().min(0, "El monto no puede ser negativo"),
  montoExento: z.number().min(0),
  montoGravado: z.number().min(0),
  itbis: z.number().min(0),
});

type NewInvoiceFormValues = z.input<typeof newInvoiceSchema>;
type DialogMode = "create" | "edit";

interface NewInvoiceDialogProps {
  onSuccess: (payload: { id: string; mode: DialogMode }) => void;
  invoice?: Invoice | null;
  onEditDone?: () => void;
}

export function NewInvoiceDialog({ onSuccess, invoice, onEditDone }: NewInvoiceDialogProps) {
  const buildDefaultValues = React.useCallback(
    (): NewInvoiceFormValues => ({
      client: "",
      description: "",
      amount: 0,
      montoExento: 0,
      montoGravado: 0,
      itbis: 0,
    }),
    [],
  );

  const defaultValues = React.useMemo<NewInvoiceFormValues>(() => buildDefaultValues(), [buildDefaultValues]);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: clients } = useClients(user?.id || "");
  const { data: configs } = useConfigs();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<NewInvoiceFormValues>({
    resolver: zodResolver(newInvoiceSchema),
    mode: "onChange",
    defaultValues,
  });

  const watchedAmount = useWatch({ control, name: "amount" });
  const [open, setOpen] = React.useState(false);
  const isEditMode = Boolean(invoice);
  const lastInvoiceIdRef = React.useRef<string | null>(null);

  const itbisPercentage = React.useMemo(() => {
    const parsed = Number(configs?.ITBIS?.percentage);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [configs]);

  const excentoPercentage = React.useMemo(() => {
    const parsed = Number(configs?.EXCENTO?.percentage);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [configs]);

  const gravadoPercentage = React.useMemo(() => {
    const parsed = Number(configs?.GRAVADO?.percentage);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [configs]);

  React.useEffect(() => {
    const amount = Number(watchedAmount ?? 0) || 0;
    const computedMontoExento = Number((amount * (excentoPercentage / 100)).toFixed(2));
    const computedMontoGravado = Number((amount * (gravadoPercentage / 100)).toFixed(2));
    const computedItbis = Number((computedMontoGravado * (itbisPercentage / 100)).toFixed(2));

    setValue("montoExento", computedMontoExento, { shouldValidate: true, shouldDirty: false });
    setValue("montoGravado", computedMontoGravado, { shouldValidate: true, shouldDirty: false });
    setValue("itbis", computedItbis, { shouldValidate: true, shouldDirty: false });
  }, [watchedAmount, excentoPercentage, gravadoPercentage, itbisPercentage, setValue]);

  React.useEffect(() => {
    const currentInvoiceId = invoice?.id ?? null;
    const lastInvoiceId = lastInvoiceIdRef.current;

    if (currentInvoiceId && invoice) {
      if (currentInvoiceId !== lastInvoiceId) {
        reset({
          client: invoice.client_id ?? "",
          description: invoice.description ?? "",
          amount: invoice.amount,
          montoExento: invoice.monto_exento,
          montoGravado: invoice.monto_gravado,
          itbis: invoice.itbis,
        });
        setOpen(true);
        lastInvoiceIdRef.current = currentInvoiceId;
      }
      return;
    }

    if (lastInvoiceId !== null) {
      lastInvoiceIdRef.current = null;
    }

    reset(buildDefaultValues());
  }, [invoice, reset, buildDefaultValues]);

  const handleClose = React.useCallback(() => {
    reset(buildDefaultValues());
    setOpen(false);
    if (invoice) onEditDone?.();
  }, [invoice, onEditDone, reset, buildDefaultValues]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewInvoiceFormValues) => {
      const isEditing = Boolean(invoice);
      const invoiceId = isEditing && invoice ? invoice.id : generateInvoiceNumber();
      const invoiceUserId = invoice?.user_id || user?.id;

      if (!invoiceUserId) {
        throw new Error("No se encontro el usuario autenticado.");
      }

      await createInvoice({
        id: invoiceId,
        invoiceType: "FISCAL",
        clientId: data.client,
        description: data.description,
        amount: Number(data.amount) || 0,
        montoExento: Number(data.montoExento) || 0,
        montoGravado: Number(data.montoGravado) || 0,
        itbis: Number(data.itbis) || 0,
        userId: invoiceUserId,
      });

      return { id: invoiceId, mode: (isEditing ? "edit" : "create") as DialogMode };
    },
    onSuccess: ({ id, mode }) => {
      toast.success(mode === "edit" ? "Factura actualizada exitosamente" : "Factura creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
      onSuccess({ id, mode });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrio un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => {
            if (invoice) onEditDone?.();
            reset(buildDefaultValues());
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva factura
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            {isEditMode ? "Editar factura" : "Nueva factura"}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            Crea una factura fiscal con cliente, monto y desglose de impuestos calculado automáticamente según la configuración actual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="dashboard-form-card grid gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Tipo de factura</label>
                  <p className="dashboard-field-hint rounded-[1rem] border border-border/60 bg-background/80 p-4 leading-6">
                    Factura con valor fiscal y calculo automático de montos exentos, gravados e ITBIS.
                  </p>
                </div>

                <div className="dashboard-field">
                  <label htmlFor="client" className="dashboard-field-label">
                    Cliente
                  </label>
                  <Controller
                    control={control}
                    name="client"
                    render={({ field }) => (
                      <ClientsCombobox clients={clients || []} value={field.value || ""} onChange={field.onChange} />
                    )}
                  />
                  {errors.client && <p className="dashboard-field-error">{errors.client.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label htmlFor="amount" className="dashboard-field-label">
                    Monto de la factura
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("amount", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                  />
                  {errors.amount && <p className="dashboard-field-error">{errors.amount.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label htmlFor="description" className="dashboard-field-label">
                    Descripción de la factura
                  </label>
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="Detalle de la factura…"
                    className="rounded-2xl border-border/70 bg-background"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="dashboard-field-error">{errors.description.message}</p>
                  )}
                </div>
              </div>

              <div className="dashboard-form-card grid gap-4">
                <div>
                  <div className="dashboard-field-label">Resumen fiscal</div>
                  <p className="dashboard-field-hint mt-1">
                    Valores calculados con la configuración activa del sistema.
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[1rem] border border-border/60 bg-background/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Monto exento ({excentoPercentage || 0}%)
                    </div>
                    <Input value={Number(watchedAmount ?? 0) ? Number((Number(watchedAmount) * (excentoPercentage / 100)).toFixed(2)) : 0} readOnly className="mt-3 h-11 rounded-2xl border-border/70 bg-background" />
                  </div>
                  <div className="rounded-[1rem] border border-border/60 bg-background/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Monto gravado ({gravadoPercentage || 0}%)
                    </div>
                    <Input value={Number(watchedAmount ?? 0) ? Number((Number(watchedAmount) * (gravadoPercentage / 100)).toFixed(2)) : 0} readOnly className="mt-3 h-11 rounded-2xl border-border/70 bg-background" />
                  </div>
                  <div className="rounded-[1rem] border border-border/60 bg-background/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      ITBIS ({itbisPercentage || 0}%)
                    </div>
                    <Input value={Number(watchedAmount ?? 0) ? Number((Number((Number(watchedAmount) * (gravadoPercentage / 100)).toFixed(2)) * (itbisPercentage / 100)).toFixed(2)) : 0} readOnly className="mt-3 h-11 rounded-2xl border-border/70 bg-background" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="dashboard-dialog-footer">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl" disabled={!isValid || isPending}>
              {isPending
                ? isEditMode
                  ? "Actualizando…"
                  : "Guardando…"
                : isEditMode
                  ? "Guardar cambios"
                  : "Imprimir y guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
