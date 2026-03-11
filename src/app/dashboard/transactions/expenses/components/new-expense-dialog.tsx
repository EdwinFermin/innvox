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
  collection,
  doc,
  runTransaction,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { accountSupportsBranch, isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { User } from "@/types/auth.types";

const newExpenseSchema = z
  .object({
    branchId: z.string().min(1, "La sucursal es obligatoria"),
    expenseTypeId: z.string().min(1, "El tipo de gasto es obligatorio"),
    date: z.string().min(1, "La fecha es obligatoria"),
    amount: z.coerce.number().positive("Monto inválido"),
    description: z.string().min(1, "La descripción es obligatoria"),
    bankAccountId: z.string().min(1, "La cuenta financiera es obligatoria"),
  });

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
  });

  const selectedBranchId = watch("branchId");

  const availableAccounts = React.useMemo(() => {
    if (!selectedBranchId) return [];
    return bankAccounts.filter((account) => accountSupportsBranch(account, selectedBranchId));
  }, [bankAccounts, selectedBranchId]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewExpenseValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      const [year, month, day] = data.date.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const userRef = doc(db, "users", user.id) as DocumentReference<User>;
      const targetAccountId = data.bankAccountId;
      const bankTransactionId = doc(collection(db, "bankTransactions")).id;

      await runTransaction(db, async (transaction) => {
        let paymentMethod: "cash" | "bank" = "bank";

        const accountRef = doc(db, "bankAccounts", targetAccountId);
        const accountSnap = await transaction.get(accountRef);

        if (!accountSnap.exists()) {
          throw new Error("La cuenta seleccionada no existe.");
        }

        const accountData = accountSnap.data();
        paymentMethod = accountData.accountType === "petty_cash" ? "cash" : "bank";
        const newBalance = accountData.currentBalance - Number(data.amount);

        transaction.update(accountRef, {
          currentBalance: newBalance,
        });

        const bankTransactionRef = doc(db, "bankTransactions", bankTransactionId);

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

        const expenseRef = doc(collection(db, "expenses"));
        transaction.set(expenseRef, {
          branchId: data.branchId,
          expenseTypeId: data.expenseTypeId,
          amount: Number(data.amount),
          description: data.description,
          date: utcDate,
          paymentMethod,
          bankAccountId: targetAccountId,
          bankTransactionId,
          createdAt: new Date(),
          createdBy: user.id,
          createdByRef: userRef,
        });

        transaction.update(bankTransactionRef, {
          linkedExpenseId: expenseRef.id,
        });
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
              <label className="text-sm font-medium">Cuenta financiera</label>
              <Select
                value={watch("bankAccountId")}
                onValueChange={(val) => setValue("bankAccountId", val, { shouldValidate: true })}
                disabled={isPending || !selectedBranchId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona la cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        {isSafeAccountImageSrc(account.iconUrl) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={account.iconUrl!}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded border object-cover"
                          />
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border bg-muted text-[9px] font-semibold text-muted-foreground">
                            {account.accountType === "bank" ? "BK" : "CJ"}
                          </span>
                        )}
                        {account.accountName}{account.accountNumber ? ` ****${account.accountNumber.slice(-4)}` : ""} - {account.accountType === "bank" ? account.bankName || "Cuenta bancaria" : "Caja"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankAccountId && (
                <p className="text-xs text-red-500">{errors.bankAccountId.message}</p>
              )}
            </div>
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
