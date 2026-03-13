"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvoice } from "@/actions/invoices";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { useAuthStore } from "@/store/auth";
import { ClientsCombobox } from "./clients-combobox";
import { generateInvoiceNumber } from "@/utils/tools";
import { useConfigs } from "@/hooks/use-configs";
import { Invoice } from "@/types/invoice.types";

const newInvoiceSchema = z.object({
  client: z.string().nonempty("El cliente es obligatorio"),
  description: z
    .string()
    .min(1, "La descripcion es obligatoria")
    .max(500, "Maximo 500 caracteres"),
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

export function NewInvoiceDialog({
  onSuccess,
  invoice,
  onEditDone,
}: NewInvoiceDialogProps) {
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
  const defaultValues = React.useMemo<NewInvoiceFormValues>(
    () => buildDefaultValues(),
    [buildDefaultValues],
  );

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

  const watchedAmount = useWatch({
    control,
    name: "amount",
  });

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
    const computedMontoExento = Number(
      (amount * (excentoPercentage / 100)).toFixed(2),
    );
    const computedMontoGravado = Number(
      (amount * (gravadoPercentage / 100)).toFixed(2),
    );
    const computedItbis = Number(
      (computedMontoGravado * (itbisPercentage / 100)).toFixed(2),
    );

    setValue("montoExento", computedMontoExento, {
      shouldValidate: true,
      shouldDirty: false,
    });
    setValue("montoGravado", computedMontoGravado, {
      shouldValidate: true,
      shouldDirty: false,
    });
    setValue("itbis", computedItbis, {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [
    watchedAmount,
    excentoPercentage,
    gravadoPercentage,
    itbisPercentage,
    setValue,
  ]);

  const [open, setOpen] = React.useState(false);
  const isEditMode = Boolean(invoice);
  const lastInvoiceIdRef = React.useRef<string | null>(null);

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
    if (invoice) {
      onEditDone?.();
    }
  }, [invoice, onEditDone, reset, buildDefaultValues]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewInvoiceFormValues) => {
      const isEditing = Boolean(invoice);
      const invoiceId =
        isEditing && invoice ? invoice.id : generateInvoiceNumber();

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

      return {
        id: invoiceId,
        mode: (isEditing ? "edit" : "create") as DialogMode,
      };
    },
    onSuccess: ({ id, mode }) => {
      toast.success(
        mode === "edit"
          ? "Factura actualizada exitosamente"
          : "Factura creada exitosamente",
      );
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
          className="w-full"
          onClick={() => {
            if (invoice) {
              onEditDone?.();
            }
            reset(buildDefaultValues());
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva Factura
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            {isEditMode ? "Editar factura" : "Nueva Factura"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-start">
                Tipo de Factura
              </label>
              <p className="text-sm text-muted-foreground">
                Factura con Valor Fiscal
              </p>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="client"
                className="text-sm font-medium text-start"
              >
                Cliente <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="client"
                render={({ field }) => (
                  <ClientsCombobox
                    clients={clients || []}
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.client && (
                <p className="text-red-500 text-xs">{errors.client.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-start"
              >
                Monto de la factura <span className="text-red-500">*</span>
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full"
                {...register("amount", {
                  setValueAs: (v) => (v === "" ? 0 : Number(v)),
                })}
              />
              {errors.amount && (
                <p className="text-red-500 text-xs">{errors.amount.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-start"
              >
                Descripcion de la factura{" "}
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Detalle de la factura"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-500 text-xs">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-start">
                Monto Exento {`(${excentoPercentage || 0}%)`}
              </label>
              <Input
                value={
                  Number(watchedAmount ?? 0)
                    ? Number(
                        (
                          Number(watchedAmount) *
                          (excentoPercentage / 100)
                        ).toFixed(2),
                      )
                    : 0
                }
                readOnly
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-start">
                Monto Gravado {`(${gravadoPercentage || 0}%)`}
              </label>
              <Input
                value={
                  Number(watchedAmount ?? 0)
                    ? Number(
                        (
                          Number(watchedAmount) *
                          (gravadoPercentage / 100)
                        ).toFixed(2),
                      )
                    : 0
                }
                readOnly
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-start">
                ITBIS {`(${itbisPercentage || 0}%)`}
              </label>
              <Input
                value={
                  Number(watchedAmount ?? 0)
                    ? Number(
                        (
                          Number(
                            (
                              Number(watchedAmount) *
                              (gravadoPercentage / 100)
                            ).toFixed(2),
                          ) *
                          (itbisPercentage / 100)
                        ).toFixed(2),
                      )
                    : 0
                }
                readOnly
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending
                ? isEditMode
                  ? "Actualizando..."
                  : "Guardando..."
                : isEditMode
                  ? "Guardar cambios"
                  : "Imprimir y Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
