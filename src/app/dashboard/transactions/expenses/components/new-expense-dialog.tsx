"use client";

import React from "react";
import { BankAccountOptionContent } from "@/components/bank-account-option-content";
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
import { createExpense, updateExpenseAccount } from "@/actions/expenses";
import { toast } from "sonner";
import { accountSupportsBranch } from "@/lib/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { Expense } from "@/types/expense.types";

const newExpenseSchema = z.object({
  branchId: z.string().min(1, "La sucursal es obligatoria"),
  expenseTypeId: z.string().min(1, "El tipo de gasto es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  amount: z.coerce.number().positive("Monto inválido"),
  description: z.string().min(1, "La descripción es obligatoria"),
  bankAccountId: z.string().min(1, "La cuenta financiera es obligatoria"),
});

type NewExpenseValues = z.infer<typeof newExpenseSchema>;
type NewExpenseFormValues = z.input<typeof newExpenseSchema>;

type ExpenseDialogMode = "create" | "edit-account";

interface NewExpenseDialogProps {
  openOnMount?: boolean;
  mode?: ExpenseDialogMode;
  initialData?: Expense;
  trigger?: React.ReactNode;
}

export function NewExpenseDialog({
  openOnMount,
  mode = "create",
  initialData,
  trigger,
}: NewExpenseDialogProps = {}) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
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

  const isEditMode = mode === "edit-account";

  const selectedBranchId = watch("branchId");
  const selectedAccountId = watch("bankAccountId");

  const availableAccounts = React.useMemo(() => {
    if (!selectedBranchId) return [];
    return bankAccounts.filter((account) =>
      accountSupportsBranch(account, selectedBranchId),
    );
  }, [bankAccounts, selectedBranchId]);

  const selectedAccount = React.useMemo(
    () =>
      availableAccounts.find((account) => account.id === selectedAccountId) ??
      null,
    [availableAccounts, selectedAccountId],
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewExpenseValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      if (isEditMode) {
        if (!initialData) {
          throw new Error("No se encontró el gasto a actualizar.");
        }

        await updateExpenseAccount({
          expenseId: initialData.id,
          bankAccountId: data.bankAccountId,
        });

        return;
      }

      const [year, month, day] = data.date.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));

      await createExpense({
        branchId: data.branchId,
        expenseTypeId: data.expenseTypeId,
        amount: Number(data.amount),
        description: data.description,
        date: utcDate.toISOString(),
        bankAccountId: data.bankAccountId,
      });
    },
    onSuccess: () => {
      toast.success(
        isEditMode ? "Cuenta del gasto actualizada" : "Gasto registrado",
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) =>
    mutate(values as NewExpenseValues),
  );

  React.useEffect(() => {
    if (openOnMount) {
      reset();
      setOpen(true);
    }
  }, [openOnMount, reset]);

  React.useEffect(() => {
    if (!open) return;

    if (isEditMode && initialData) {
      const date = new Date(initialData.date).toISOString().slice(0, 10);

      reset({
        branchId: initialData.branch_id,
        expenseTypeId: initialData.expense_type_id,
        date,
        amount: initialData.amount,
        description: initialData.description ?? "",
        bankAccountId: initialData.bank_account_id ?? "",
      });
      return;
    }

    reset();
  }, [initialData, isEditMode, open, reset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" className="w-full" onClick={() => reset()}>
            <PlusCircle className="mr-1" />
            Nuevo gasto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            {isEditMode ? "Cambiar cuenta del gasto" : "Nuevo gasto"}
          </DialogTitle>
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
                disabled={isPending || isEditMode}
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
                disabled={isPending || isEditMode}
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
                disabled={isPending || isEditMode}
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
                disabled={isPending || isEditMode}
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
                value={selectedAccountId}
                onValueChange={(val) =>
                  setValue("bankAccountId", val, { shouldValidate: true })
                }
                disabled={isPending || !selectedBranchId}
              >
                <SelectTrigger className="h-auto min-h-12 w-full">
                  {selectedAccount ? (
                    <BankAccountOptionContent account={selectedAccount} />
                  ) : (
                    <SelectValue placeholder="Selecciona la cuenta" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      className="py-2"
                    >
                      <BankAccountOptionContent account={account} />
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripcion</label>
            <Textarea
              rows={3}
              placeholder="Detalle del gasto"
              {...register("description")}
              disabled={isPending || isEditMode}
            />
            {errors.description && (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending
                ? "Guardando..."
                : isEditMode
                  ? "Actualizar cuenta"
                  : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
