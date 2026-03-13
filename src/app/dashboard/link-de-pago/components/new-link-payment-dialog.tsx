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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTitle } from "@radix-ui/react-dialog";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <PlusCircle className="mr-1" />
          Nuevo link de pago
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Link de pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sucursal</label>
            <Select
              value={watch("branchId")}
              onValueChange={(val) =>
                setValue("branchId", val, { shouldValidate: true })
              }
              disabled={isPending}
            >
              <SelectTrigger>
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
              <p className="text-xs text-red-500">{errors.branchId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount")}
                disabled={isPending}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Input value="Pendiente" disabled />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">URL interna de pago</label>
            <Input
              type="url"
              placeholder="https://pagos.tuapp.com/checkout/123"
              {...register("paymentUrl")}
              disabled={isPending}
            />
            {errors.paymentUrl && (
              <p className="text-xs text-red-500">{errors.paymentUrl.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
