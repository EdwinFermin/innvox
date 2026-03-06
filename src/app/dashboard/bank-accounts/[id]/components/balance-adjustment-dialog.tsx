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
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";

const balanceAdjustmentSchema = z.object({
  newBalance: z.number({ error: "El balance es obligatorio" }),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type BalanceAdjustmentValues = z.infer<typeof balanceAdjustmentSchema>;
type BalanceAdjustmentFormValues = z.input<typeof balanceAdjustmentSchema>;

interface BalanceAdjustmentDialogProps {
  accountId: string;
  accountName: string;
  currentBalance: number;
  currency: string;
}

export function BalanceAdjustmentDialog({
  accountId,
  accountName,
  currentBalance,
  currency,
}: BalanceAdjustmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<BalanceAdjustmentFormValues>({
    resolver: zodResolver(balanceAdjustmentSchema),
    mode: "onChange",
    defaultValues: {
      newBalance: currentBalance,
      description: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: BalanceAdjustmentValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      const adjustmentAmount = data.newBalance - currentBalance;

      await runTransaction(db, async (transaction) => {
        // Update account balance
        const accountRef = doc(db, "bankAccounts", accountId);
        transaction.update(accountRef, {
          currentBalance: data.newBalance,
        });

        // Create adjustment transaction record
        const transactionRef = doc(collection(db, "bankTransactions"));
        transaction.set(transactionRef, {
          bankAccountId: accountId,
          type: "adjustment",
          amount: adjustmentAmount,
          description: data.description,
          date: new Date(),
          balanceAfter: data.newBalance,
          createdAt: new Date(),
          createdBy: user.id,
        });
      });
    },
    onSuccess: () => {
      toast.success("Balance ajustado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bankAccount", accountId] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) =>
    mutate(values as BalanceAdjustmentValues)
  );

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
          variant="outline"
          onClick={() => {
            reset({ newBalance: currentBalance, description: "" });
            setOpen(true);
          }}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Ajustar Balance
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Ajustar Balance</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          <p>
            Cuenta: <span className="font-medium">{accountName}</span>
          </p>
          <p>
            Balance actual:{" "}
            <span className="font-medium">{formatCurrency(currentBalance)}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nuevo Balance</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("newBalance", { valueAsNumber: true })}
              disabled={isPending}
            />
            {errors.newBalance && (
              <p className="text-xs text-red-500">{errors.newBalance.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Descripción del Ajuste
            </label>
            <Textarea
              rows={3}
              placeholder="Ej. Ajuste por conciliación bancaria"
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
            disabled={!isValid || isPending}
          >
            {isPending ? "Guardando..." : "Aplicar Ajuste"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
