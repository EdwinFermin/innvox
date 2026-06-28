"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useBranches } from "@/hooks/use-branches";
import { createLinkPayment } from "@/actions/link-payments";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const newLinkPaymentSchema = z.object({
  branchId: z.string().min(1, "La sucursal es obligatoria"),
  amount: z.coerce.number().positive("Monto invalido"),
  paymentUrl: z.url("Ingresa una URL valida"),
});

type NewLinkPaymentValues = z.infer<typeof newLinkPaymentSchema>;
type NewLinkPaymentFormValues = z.input<typeof newLinkPaymentSchema>;

export function NewLinkPaymentDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );

  const {
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    register,
    watch,
  } = useForm<NewLinkPaymentFormValues>({
    resolver: zodResolver(newLinkPaymentSchema),
    mode: "onChange",
    defaultValues: {
      branchId: "",
      amount: undefined,
      paymentUrl: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewLinkPaymentValues) => {
      if (!user?.id) {
        throw new Error("No se encontro el usuario autenticado.");
      }

      await createLinkPayment({
        branch_id: data.branchId,
        amount: Number(data.amount),
        payment_url: data.paymentUrl,
      });
    },
    onSuccess: () => {
      toast.success("Link de pago creado");
      queryClient.invalidateQueries({ queryKey: ["linkPayments"] });
      reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ocurrio un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewLinkPaymentValues));

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Nuevo link de pago"
      description="Crea un link pendiente por sucursal, define el monto y deja lista la URL interna para compartir o generar QR."
      contentClassName="max-h-[90vh] max-w-lg w-[calc(100vw-2rem)] overflow-y-auto"
      trigger={
        <Button
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <PlusCircle className="mr-1" />
          Nuevo link de pago
        </Button>
      }
      onSubmit={onSubmit}
      isSubmitting={isPending}
      canSubmit={isValid}
      submitLabel="Guardar link"
      submittingLabel="Guardando..."
    >
            <div className="dashboard-form-card space-y-4">
              <div className="dashboard-field">
                <label className="dashboard-field-label">Sucursal</label>
            <Select
              value={watch("branchId")}
              onValueChange={(val) =>
                setValue("branchId", val, { shouldValidate: true })
              }
              disabled={isPending}
            >
              <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background data-[size=default]:h-11">
                <SelectValue placeholder="Selecciona una sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && (
              <p className="dashboard-field-error">{errors.branchId.message}</p>
            )}
          </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Monto</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="h-11 rounded-2xl border-border/70 bg-background"
                {...register("amount")}
                disabled={isPending}
              />
              {errors.amount && (
                <p className="dashboard-field-error">{errors.amount.message}</p>
              )}
            </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Estado</label>
                  <Input value="Pendiente" disabled className="h-11 rounded-2xl border-border/70 bg-background" />
                </div>
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">URL interna de pago</label>
                <Input
                  type="url"
                  placeholder="https://pagos.tuapp.com/checkout/123"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("paymentUrl")}
                  disabled={isPending}
                />
                {errors.paymentUrl && (
                  <p className="dashboard-field-error">{errors.paymentUrl.message}</p>
                )}
              </div>
            </div>
    </FormDialog>
  );
}
