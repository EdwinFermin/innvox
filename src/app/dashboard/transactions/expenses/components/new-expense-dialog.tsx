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
import { PlusCircle } from "lucide-react";
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
import {
  addDoc,
  collection,
  doc,
  runTransaction,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { User } from "@/types/auth.types";
import { PaymentMethod } from "@/types/bank-account.types";

const newExpenseSchema = z
  .object({
    branchId: z.string().min(1, "La sucursal es obligatoria"),
    expenseTypeId: z.string().min(1, "El tipo de gasto es obligatorio"),
    date: z.string().min(1, "La fecha es obligatoria"),
    amount: z.coerce.number().positive("Monto inválido"),
    description: z.string().min(1, "La descripción es obligatoria"),
    paymentMethod: z.enum(["cash", "bank"], {
      error: "El método de pago es obligatorio",
    }),
    bankAccountId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.paymentMethod === "bank") {
        return data.bankAccountId && data.bankAccountId.length > 0;
      }
      return true;
    },
    {
      message: "La cuenta bancaria es obligatoria para pagos con banco",
      path: ["bankAccountId"],
    }
  );

type NewExpenseValues = z.infer<typeof newExpenseSchema>;
type NewExpenseFormValues = z.input<typeof newExpenseSchema>;

export function NewExpenseDialog({
  openOnMount,
}: { openOnMount?: boolean } = {}) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branchIds : undefined,
  );
  const { data: expenseTypes } = useExpenseTypes(user?.id || "");
  const { data: bankAccounts } = useBankAccounts(user?.id || "");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<NewExpenseFormValues>({
    resolver: zodResolver(newExpenseSchema),
    mode: "onChange",
    defaultValues: {
      paymentMethod: "cash",
    },
  });

  const selectedBranchId = watch("branchId");
  const paymentMethod = watch("paymentMethod");

  // Filter bank accounts by selected branch
  const availableBankAccounts = React.useMemo(() => {
    if (!selectedBranchId) return [];
    return bankAccounts.filter((account) => account.branchId === selectedBranchId);
  }, [bankAccounts, selectedBranchId]);

  // Get petty cash account for the branch
  const pettyCashAccount = React.useMemo(() => {
    return availableBankAccounts.find((account) => account.accountType === "petty_cash");
  }, [availableBankAccounts]);

  // Get bank accounts (excluding petty cash)
  const bankOnlyAccounts = React.useMemo(() => {
    return availableBankAccounts.filter((account) => account.accountType === "bank");
  }, [availableBankAccounts]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewExpenseValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      const [year, month, day] = data.date.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const userRef = doc(db, "users", user.id) as DocumentReference<User>;

      // Determine which account to affect
      let targetAccountId: string | undefined;
      if (data.paymentMethod === "cash" && pettyCashAccount) {
        targetAccountId = pettyCashAccount.id;
      } else if (data.paymentMethod === "bank" && data.bankAccountId) {
        targetAccountId = data.bankAccountId;
      }

      await runTransaction(db, async (transaction) => {
        let bankTransactionId: string | undefined;
        let newBalance: number | undefined;

        // If we have a target account, create bank transaction and update balance
        if (targetAccountId) {
          const accountRef = doc(db, "bankAccounts", targetAccountId);
          const accountSnap = await transaction.get(accountRef);

          if (accountSnap.exists()) {
            const accountData = accountSnap.data();
            newBalance = accountData.currentBalance - Number(data.amount);

            // Update account balance
            transaction.update(accountRef, {
              currentBalance: newBalance,
            });

            // Create bank transaction record
            const bankTransactionRef = doc(collection(db, "bankTransactions"));
            bankTransactionId = bankTransactionRef.id;

            transaction.set(bankTransactionRef, {
              bankAccountId: targetAccountId,
              type: "withdrawal",
              amount: Number(data.amount),
              description: `Gasto: ${data.description}`,
              date: utcDate,
              balanceAfter: newBalance,
              createdAt: new Date(),
              createdBy: user.id,
            });
          }
        }

        // Create expense record
        const expenseRef = doc(collection(db, "expenses"));
        transaction.set(expenseRef, {
          branchId: data.branchId,
          expenseTypeId: data.expenseTypeId,
          amount: Number(data.amount),
          description: data.description,
          date: utcDate,
          paymentMethod: data.paymentMethod,
          bankAccountId: targetAccountId || null,
          bankTransactionId: bankTransactionId || null,
          createdAt: new Date(),
          createdBy: user.id,
          createdByRef: userRef,
        });

        // Update bank transaction with expense reference
        if (bankTransactionId) {
          const bankTransactionRef = doc(db, "bankTransactions", bankTransactionId);
          transaction.update(bankTransactionRef, {
            linkedExpenseId: expenseRef.id,
          });
        }
      });
    },
    onSuccess: () => {
      toast.success("Gasto registrado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewExpenseValues));

  React.useEffect(() => {
    if (openOnMount) {
      reset();
      setOpen(true);
    }
  }, [openOnMount, reset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full" onClick={() => reset()}>
          <PlusCircle className="mr-1" />
          Nuevo gasto
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Nuevo gasto</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={watch("branchId")}
                onValueChange={(val) =>
                  setValue("branchId", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
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
                <p className="text-xs text-red-500">
                  {errors.branchId.message}
                </p>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Tipo de gasto</label>
              <Select
                value={watch("expenseTypeId")}
                onValueChange={(val) =>
                  setValue("expenseTypeId", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expenseTypeId && (
                <p className="text-xs text-red-500">
                  {errors.expenseTypeId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 mr-6 md:mr-0">
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                {...register("date")}
                disabled={isPending}
                className="w-full border border-input rounded-md pl-1 h-9"
              />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2 min-w-0">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Método de Pago</label>
              <Select
                value={paymentMethod}
                onValueChange={(val: PaymentMethod) => {
                  setValue("paymentMethod", val, { shouldValidate: true });
                  // Reset bank account when switching to cash
                  if (val === "cash") {
                    setValue("bankAccountId", undefined);
                  }
                }}
                disabled={isPending || !selectedBranchId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona el método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash" disabled={!pettyCashAccount}>
                    Efectivo (Caja Chica)
                    {!pettyCashAccount && selectedBranchId && " - No disponible"}
                  </SelectItem>
                  <SelectItem value="bank" disabled={bankOnlyAccounts.length === 0}>
                    Banco
                    {bankOnlyAccounts.length === 0 && selectedBranchId && " - No disponible"}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <p className="text-xs text-red-500">
                  {errors.paymentMethod.message}
                </p>
              )}
            </div>

            {paymentMethod === "bank" && (
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Cuenta Bancaria</label>
                <Select
                  value={watch("bankAccountId")}
                  onValueChange={(val) =>
                    setValue("bankAccountId", val, { shouldValidate: true })
                  }
                  disabled={isPending || bankOnlyAccounts.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona la cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOnlyAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountName} ({account.bankName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankAccountId && (
                  <p className="text-xs text-red-500">
                    {errors.bankAccountId.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              rows={3}
              placeholder="Detalle del gasto"
              {...register("description")}
              disabled={isPending}
            />
            {errors.description && (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
