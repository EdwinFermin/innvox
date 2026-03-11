"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, runTransaction } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { getBankAccountBranchIds } from "@/lib/bank-accounts";
import { db } from "@/lib/firebase";
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
}

export function TransferFundsDialog({
  account,
  open,
  onOpenChange,
}: TransferFundsDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const allowedBranchIds =
    user?.type === "USER" ? user?.branchIds : undefined;
  const { data: allAccounts } = useBankAccounts(user?.id || "", {
    allowedBranchIds,
    activeOnly: false,
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
        amount: 0,
        description: "",
      });
    }
  }, [open, reset]);

  const availableDestinations = React.useMemo(
    () =>
      allAccounts.filter(
        (item) =>
          item.id !== account.id &&
          item.currency === account.currency,
      ),
    [account.currency, account.id, allAccounts],
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      if (!user?.id)
        throw new Error("No se encontro el usuario autenticado.");
      if (values.amount > account.currentBalance)
        throw new Error("El monto excede el balance disponible.");

      await runTransaction(db, async (transaction) => {
        const destRef = doc(
          db,
          "bankAccounts",
          values.destinationAccountId,
        );
        const destSnap = await transaction.get(destRef);
        if (!destSnap.exists())
          throw new Error("La cuenta destino no existe.");
        const dest = destSnap.data() as BankAccount;

        const sourceRef = doc(db, "bankAccounts", account.id);
        const newSourceBalance =
          account.currentBalance - values.amount;
        const newDestBalance = dest.currentBalance + values.amount;

        transaction.update(sourceRef, {
          currentBalance: newSourceBalance,
        });
        transaction.update(destRef, {
          currentBalance: newDestBalance,
        });

        const outRef = doc(collection(db, "bankTransactions"));
        const inRef = doc(collection(db, "bankTransactions"));

        transaction.set(outRef, {
          bankAccountId: account.id,
          type: "transfer_out",
          amount: values.amount,
          description: values.description,
          date: new Date(),
          balanceAfter: newSourceBalance,
          relatedTransferId: inRef.id,
          relatedAccountId: values.destinationAccountId,
          createdAt: new Date(),
          createdBy: user.id,
        });
        transaction.set(inRef, {
          bankAccountId: values.destinationAccountId,
          type: "transfer_in",
          amount: values.amount,
          description: values.description,
          date: new Date(),
          balanceAfter: newDestBalance,
          relatedTransferId: outRef.id,
          relatedAccountId: account.id,
          createdAt: new Date(),
          createdBy: user.id,
        });
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
    onError: (error: FirebaseError | Error) =>
      toast.error(error.message || "Ocurrio un error inesperado."),
  });

  const formatBalance = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: account.currency,
  }).format(account.currentBalance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Transferir fondos
          </DialogTitle>
          <DialogDescription>
            Desde: <span className="font-medium">{account.accountName}</span>
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
              value={watch("destinationAccountId")}
              onValueChange={(val) =>
                setValue("destinationAccountId", val, {
                  shouldValidate: true,
                })
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la cuenta destino" />
              </SelectTrigger>
              <SelectContent>
                {availableDestinations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay cuentas disponibles
                  </SelectItem>
                ) : (
                  availableDestinations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.accountName} -{" "}
                      {item.accountType === "bank"
                        ? item.bankName || "Cuenta bancaria"
                        : "Caja"}{" "}
                      - {getBankAccountBranchIds(item).length} suc.
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
              max={account.currentBalance}
              {...register("amount", { valueAsNumber: true })}
              disabled={isPending}
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
              {isPending ? "Transfiriendo..." : "Transferir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
