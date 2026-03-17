"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { transferFunds } from "@/actions/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { BankAccount } from "@/types/bank-account.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  destinationAccountId: z.string().min(1, "Selecciona una cuenta destino"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  description: z.string().min(1, "La descripcion es obligatoria"),
});

type Values = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

interface TransferFundsDialogProps {
  account: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAmount?: number;
  initialDescription?: string;
  lockAmount?: boolean;
}

export function TransferFundsDialog({
  account,
  open,
  onOpenChange,
  initialAmount,
  initialDescription,
  lockAmount = false,
}: TransferFundsDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const allowedBranchIds =
    user?.type === "USER" ? user?.branch_ids : undefined;
  const { data: allAccounts } = useBankAccounts(user?.id || "", {
    allowedBranchIds,
    activeOnly: true,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      destinationAccountId: "",
      amount: 0,
      description: "",
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        destinationAccountId: "",
        amount: initialAmount ?? 0,
        description: initialDescription ?? "",
      });
    }
  }, [initialAmount, initialDescription, open, reset]);

  const availableDestinations = React.useMemo(
    () =>
      allAccounts.filter(
        (item) =>
          item.id !== account.id &&
          item.currency === account.currency,
      ),
    [account.currency, account.id, allAccounts],
  );

  const selectedDestinationId = watch("destinationAccountId");
  const selectedDestination = React.useMemo(
    () =>
      availableDestinations.find(
        (item) => item.id === selectedDestinationId,
      ) ?? null,
    [availableDestinations, selectedDestinationId],
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      if (!user?.id)
        throw new Error("No se encontro el usuario autenticado.");
      if (values.amount > account.current_balance)
        throw new Error("El monto excede el balance disponible.");

      await transferFunds({
        sourceAccountId: account.id,
        destAccountId: values.destinationAccountId,
        amount: values.amount,
        description: values.description,
      });
    },
    onSuccess: () => {
      toast.success("Transferencia realizada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bankAccount"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({
        queryKey: ["bankTransactions"],
      });
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
            Mover fondos
          </DialogTitle>
          <DialogDescription>
            Desde: <span className="font-medium">{account.account_name}</span>
            {" \u00B7 "}
            Balance disponible:{" "}
            <span className="font-medium">{formatBalance}</span>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutate(values as Values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Cuenta destino
            </label>
            <Select
              value={selectedDestinationId}
              onValueChange={(val) =>
                setValue("destinationAccountId", val, {
                  shouldValidate: true,
                })
              }
              disabled={isPending}
            >
              <SelectTrigger className="h-auto min-h-12 w-full">
                {selectedDestination ? (
                  <BankAccountOptionContent account={selectedDestination} />
                ) : (
                  <SelectValue placeholder="Selecciona la cuenta destino" />
                )}
              </SelectTrigger>
              <SelectContent>
                {availableDestinations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay cuentas disponibles
                  </SelectItem>
                ) : (
                  availableDestinations.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="py-2">
                      <BankAccountOptionContent account={item} />
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.destinationAccountId ? (
              <p className="text-xs text-red-500">
                {errors.destinationAccountId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monto</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={account.current_balance}
              {...register("amount", { valueAsNumber: true })}
              disabled={isPending || lockAmount}
            />
            {errors.amount ? (
              <p className="text-xs text-red-500">
                {errors.amount.message}
              </p>
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

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Moviendo..." : "Mover"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
