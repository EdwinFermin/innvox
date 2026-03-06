"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { BankAccount } from "@/types/bank-account.types";

const transferSchema = z.object({
  destinationAccountId: z.string().min(1, "La cuenta destino es obligatoria"),
  amount: z.number({ error: "El monto es obligatorio" }).positive("El monto debe ser mayor a 0"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type TransferValues = z.infer<typeof transferSchema>;
type TransferFormValues = z.input<typeof transferSchema>;

interface TransferDialogProps {
  sourceAccountId: string;
  sourceAccountName: string;
  currency: string;
  currentBalance: number;
}

export function TransferDialog({
  sourceAccountId,
  sourceAccountName,
  currency,
  currentBalance,
}: TransferDialogProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: allAccounts } = useBankAccounts(user?.id || "");

  // Filter out the source account and accounts with different currencies
  const availableDestinations = React.useMemo(() => {
    return allAccounts.filter(
      (account) =>
        account.id !== sourceAccountId && account.currency === currency
    );
  }, [allAccounts, sourceAccountId, currency]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    mode: "onChange",
    defaultValues: {
      description: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: TransferValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      if (data.amount > currentBalance) {
        throw new Error("El monto excede el balance disponible.");
      }

      await runTransaction(db, async (transaction) => {
        // Get destination account
        const destAccountRef = doc(db, "bankAccounts", data.destinationAccountId);
        const destAccountSnap = await transaction.get(destAccountRef);

        if (!destAccountSnap.exists()) {
          throw new Error("La cuenta destino no existe.");
        }

        const destAccount = destAccountSnap.data() as BankAccount;
        const sourceAccountRef = doc(db, "bankAccounts", sourceAccountId);

        // Calculate new balances
        const newSourceBalance = currentBalance - data.amount;
        const newDestBalance = destAccount.currentBalance + data.amount;

        // Update source account balance
        transaction.update(sourceAccountRef, {
          currentBalance: newSourceBalance,
        });

        // Update destination account balance
        transaction.update(destAccountRef, {
          currentBalance: newDestBalance,
        });

        // Create outgoing transaction for source account
        const outgoingRef = doc(collection(db, "bankTransactions"));
        const incomingRef = doc(collection(db, "bankTransactions"));

        transaction.set(outgoingRef, {
          bankAccountId: sourceAccountId,
          type: "transfer_out",
          amount: data.amount,
          description: data.description,
          date: new Date(),
          balanceAfter: newSourceBalance,
          relatedTransferId: incomingRef.id,
          relatedAccountId: data.destinationAccountId,
          createdAt: new Date(),
          createdBy: user.id,
        });

        // Create incoming transaction for destination account
        transaction.set(incomingRef, {
          bankAccountId: data.destinationAccountId,
          type: "transfer_in",
          amount: data.amount,
          description: data.description,
          date: new Date(),
          balanceAfter: newDestBalance,
          relatedTransferId: outgoingRef.id,
          relatedAccountId: sourceAccountId,
          createdAt: new Date(),
          createdBy: user.id,
        });
      });
    },
    onSuccess: () => {
      toast.success("Transferencia realizada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bankAccount"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError | Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as TransferValues));

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Transferir
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Transferir Fondos
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          <p>
            Desde: <span className="font-medium">{sourceAccountName}</span>
          </p>
          <p>
            Balance disponible:{" "}
            <span className="font-medium">{formatCurrency(currentBalance)}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cuenta Destino</label>
            <Select
              value={watch("destinationAccountId")}
              onValueChange={(val) =>
                setValue("destinationAccountId", val, { shouldValidate: true })
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona la cuenta destino" />
              </SelectTrigger>
              <SelectContent>
                {availableDestinations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No hay cuentas disponibles
                  </SelectItem>
                ) : (
                  availableDestinations.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountName}{" "}
                      {account.accountType === "bank"
                        ? `(${account.bankName})`
                        : "(Caja Chica)"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.destinationAccountId && (
              <p className="text-xs text-red-500">
                {errors.destinationAccountId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monto</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={currentBalance}
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
              disabled={isPending}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              rows={3}
              placeholder="Ej. Transferencia para gastos operativos"
              {...register("description")}
              disabled={isPending}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={!isValid || isPending || availableDestinations.length === 0}
          >
            {isPending ? "Procesando..." : "Realizar Transferencia"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
