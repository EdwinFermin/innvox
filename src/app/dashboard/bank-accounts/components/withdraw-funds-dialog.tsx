"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ClientsCombobox } from "@/app/dashboard/invoices/components/clients-combobox";
import { withdrawFunds } from "@/actions/bank-accounts";
import { useClients } from "@/hooks/use-clients";
import { useAuthStore } from "@/store/auth";
import { BankAccount } from "@/types/bank-account.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getTodayDateKey } from "@/utils/dates";

const schema = z
  .object({
    amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
    description: z.string().min(1, "La descripcion es obligatoria"),
    createReceivable: z.boolean(),
    clientId: z.string(),
    dueDate: z.string(),
  })
  .refine((data) => !data.createReceivable || data.clientId.length > 0, {
    message: "El cliente es obligatorio",
    path: ["clientId"],
  })
  .refine((data) => !data.createReceivable || data.dueDate.length > 0, {
    message: "La fecha de vencimiento es obligatoria",
    path: ["dueDate"],
  });

type Values = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

interface WithdrawFundsDialogProps {
  account: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawFundsDialog({
  account,
  open,
  onOpenChange,
}: WithdrawFundsDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: clients } = useClients(user?.id || "");

  const receivableBranchId = account.branch_ids?.[0] ?? account.branch_id ?? null;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue,
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      amount: 0,
      description: "",
      createReceivable: false,
      clientId: "",
      dueDate: getTodayDateKey(),
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        amount: 0,
        description: "",
        createReceivable: false,
        clientId: "",
        dueDate: getTodayDateKey(),
      });
    }
  }, [open, reset]);

  const createReceivable = watch("createReceivable");

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      if (!user?.id) throw new Error("No se encontro el usuario autenticado.");

      if (values.amount > account.current_balance) {
        throw new Error("Fondos insuficientes en la cuenta.");
      }

      await withdrawFunds({
        bankAccountId: account.id,
        amount: values.amount,
        description: values.description,
        createReceivable: values.createReceivable,
        receivableClientId: values.createReceivable ? values.clientId : null,
        receivableBranchId: values.createReceivable ? receivableBranchId : null,
        receivableDueDate: values.createReceivable ? values.dueDate : null,
      });
    },
    onSuccess: () => {
      toast.success("Retiro realizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bankAccount", account.id] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      onOpenChange(false);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Ocurrio un error inesperado."),
  });

  const formatBalance = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: account.currency,
  }).format(account.current_balance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Retiro de dinero
          </DialogTitle>
          <DialogDescription>
            Cuenta:{" "}
            <span className="font-medium">{account.account_name}</span>
            {" · "}
            Balance actual:{" "}
            <span className="font-medium">{formatBalance}</span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutate(values as Values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Monto a retirar</label>
            <Input
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              disabled={isPending}
            />
            {errors.amount ? (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripcion</label>
            <Textarea
              rows={3}
              {...register("description")}
              disabled={isPending}
            />
            {errors.description ? (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="createReceivable"
                checked={createReceivable}
                onCheckedChange={(checked) =>
                  setValue("createReceivable", checked === true, {
                    shouldValidate: true,
                  })
                }
                disabled={isPending}
              />
              <label
                htmlFor="createReceivable"
                className="text-sm cursor-pointer font-medium"
              >
                Crear cuenta por cobrar por este retiro
              </label>
            </div>

            {createReceivable ? (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Controller
                    control={control}
                    name="clientId"
                    render={({ field }) => (
                      <ClientsCombobox
                        clients={clients || []}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.clientId ? (
                    <p className="text-xs text-red-500">
                      {errors.clientId.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vencimiento</label>
                  <Input
                    type="date"
                    {...register("dueDate")}
                    disabled={isPending}
                  />
                  {errors.dueDate ? (
                    <p className="text-xs text-red-500">
                      {errors.dueDate.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Procesando..." : "Realizar retiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
