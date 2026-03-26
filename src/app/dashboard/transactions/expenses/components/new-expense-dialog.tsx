"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createExpense, updateExpenseAccount } from "@/actions/expenses";
import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useBranches } from "@/hooks/use-branches";
import { useConfigs } from "@/hooks/use-configs";
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { accountSupportsBranch } from "@/lib/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { Expense } from "@/types/expense.types";
import {
  dateOnlyToISOString,
  extractDateOnlyKey,
  getDateInputValue,
  getTodayDateKey,
} from "@/utils/dates";

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
  const { data: configs } = useConfigs();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const { data: expenseTypes } = useExpenseTypes(user?.id || "");
  const { data: bankAccounts } = useBankAccounts(user?.id || "");

  const [includeLBTR, setIncludeLBTR] = React.useState(false);
  const [includeTransferTax, setIncludeTransferTax] = React.useState(false);

  const lbtrFeeAmount = React.useMemo(() => {
    const raw = configs.LBTR_FEE?.amount;
    return raw ? Number(raw) : 0;
  }, [configs]);

  const transferTaxPercentage = React.useMemo(() => {
    const raw = configs.TRANSFER_TAX?.percentage;
    return raw ? Number(raw) : 0;
  }, [configs]);

  const formatCurrency = React.useCallback(
    (value: number) =>
      new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "DOP",
      }).format(value),
    [],
  );

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
    return bankAccounts.filter((account) => accountSupportsBranch(account, selectedBranchId));
  }, [bankAccounts, selectedBranchId]);

  const selectedAccount = React.useMemo(
    () => availableAccounts.find((account) => account.id === selectedAccountId) ?? null,
    [availableAccounts, selectedAccountId],
  );

  const watchedAmount = watch("amount");
  const currentAmount = React.useMemo(() => Number(watchedAmount) || 0, [watchedAmount]);

  const computedLBTR = includeLBTR ? lbtrFeeAmount : 0;
  const computedTax = includeTransferTax
    ? Math.round(currentAmount * (transferTaxPercentage / 100) * 100) / 100
    : 0;
  const totalDeduction = currentAmount + computedLBTR + computedTax;

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

      const lbtr = includeLBTR ? lbtrFeeAmount : 0;
      const tax = includeTransferTax
        ? Math.round(Number(data.amount) * (transferTaxPercentage / 100) * 100) / 100
        : 0;

      await createExpense({
        branchId: data.branchId,
        expenseTypeId: data.expenseTypeId,
        amount: Number(data.amount),
        description: data.description,
        date: dateOnlyToISOString(data.date),
        bankAccountId: data.bankAccountId,
        lbtrFee: lbtr > 0 ? lbtr : undefined,
        transferTax: tax > 0 ? tax : undefined,
      });
    },
    onSuccess: () => {
      toast.success(isEditMode ? "Cuenta del gasto actualizada" : "Gasto registrado");
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

  const onSubmit = handleSubmit((values) => mutate(values as NewExpenseValues));

  React.useEffect(() => {
    if (openOnMount) {
      reset();
      setIncludeLBTR(false);
      setIncludeTransferTax(false);
      setOpen(true);
    }
  }, [openOnMount, reset]);

  React.useEffect(() => {
    if (!open) return;

    setIncludeLBTR(false);
    setIncludeTransferTax(false);

    if (isEditMode && initialData) {
      const date = extractDateOnlyKey(initialData.date) ?? "";
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
          <Button variant="default" className="w-full rounded-2xl sm:w-auto" onClick={() => reset()}>
            <PlusCircle className="mr-1" />
            Nuevo gasto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            {isEditMode ? "Cambiar cuenta del gasto" : "Nuevo gasto"}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            {isEditMode
              ? "Actualiza la cuenta financiera asociada a este gasto sin modificar el resto de la operación."
              : "Registra una salida de dinero con su sucursal, categoría, fecha y cuenta financiera asociada."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="dashboard-form-card grid gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Sucursal</label>
                  <Select
                    value={watch("branchId")}
                    onValueChange={(val) => setValue("branchId", val, { shouldValidate: true })}
                    disabled={isPending || isEditMode}
                  >
                    <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background px-4 py-3 text-base">
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
                  {errors.branchId && <p className="dashboard-field-error">{errors.branchId.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Tipo de gasto</label>
                  <Select
                    value={watch("expenseTypeId")}
                    onValueChange={(val) => setValue("expenseTypeId", val, { shouldValidate: true })}
                    disabled={isPending || isEditMode}
                  >
                    <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background px-4 py-3 text-base">
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
                  {errors.expenseTypeId && <p className="dashboard-field-error">{errors.expenseTypeId.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Fecha</label>
                  <input
                    type="date"
                    {...register("date")}
                    value={getDateInputValue(watch("date"))}
                    disabled={isPending || isEditMode}
                    max={getTodayDateKey()}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                  />
                  {errors.date && <p className="dashboard-field-error">{errors.date.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Monto</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("amount")}
                    disabled={isPending || isEditMode}
                  />
                  {errors.amount && <p className="dashboard-field-error">{errors.amount.message}</p>}
                </div>
              </div>

              <div className="dashboard-form-card flex h-full flex-col gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Cuenta financiera</label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={(val) => setValue("bankAccountId", val, { shouldValidate: true })}
                    disabled={isPending || !selectedBranchId}
                  >
                    <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background">
                      {selectedAccount ? (
                        <BankAccountOptionContent account={selectedAccount} />
                      ) : (
                        <SelectValue placeholder="Selecciona la cuenta" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} className="py-2">
                          <BankAccountOptionContent account={account} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.bankAccountId && (
                    <p className="dashboard-field-error">{errors.bankAccountId.message}</p>
                  )}
                </div>

                {!isEditMode && (lbtrFeeAmount > 0 || transferTaxPercentage > 0) ? (
                  <div className="space-y-3 rounded-xl border p-3">
                    <p className="text-sm font-medium">Comisiones</p>

                    {lbtrFeeAmount > 0 ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="expIncludeLBTR"
                          checked={includeLBTR}
                          onCheckedChange={(checked) => setIncludeLBTR(checked === true)}
                          disabled={isPending}
                        />
                        <label htmlFor="expIncludeLBTR" className="text-sm cursor-pointer">
                          Incluir comision LBTR ({formatCurrency(lbtrFeeAmount)})
                        </label>
                      </div>
                    ) : null}

                    {transferTaxPercentage > 0 ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="expIncludeTransferTax"
                          checked={includeTransferTax}
                          onCheckedChange={(checked) => setIncludeTransferTax(checked === true)}
                          disabled={isPending}
                        />
                        <label htmlFor="expIncludeTransferTax" className="text-sm cursor-pointer">
                          Incluir impuesto de transferencia ({transferTaxPercentage}%)
                        </label>
                      </div>
                    ) : null}

                    {(computedLBTR > 0 || computedTax > 0) && currentAmount > 0 ? (
                      <div className="space-y-1 border-t pt-2 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Monto del gasto</span>
                          <span>{formatCurrency(currentAmount)}</span>
                        </div>
                        {computedLBTR > 0 ? (
                          <div className="flex justify-between">
                            <span>Comision LBTR</span>
                            <span>+{formatCurrency(computedLBTR)}</span>
                          </div>
                        ) : null}
                        {computedTax > 0 ? (
                          <div className="flex justify-between">
                            <span>Impuesto ({transferTaxPercentage}%)</span>
                            <span>+{formatCurrency(computedTax)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between font-medium text-foreground border-t pt-1">
                          <span>Total a debitar</span>
                          <span>{formatCurrency(totalDeduction)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="dashboard-field mt-auto">
                  <label className="dashboard-field-label">Estado del formulario</label>
                  <p className="dashboard-field-hint dashboard-info-surface leading-6">
                    {selectedBranchId
                      ? "La lista de cuentas se filtra automaticamente según la sucursal seleccionada."
                      : "Selecciona una sucursal para habilitar las cuentas financieras disponibles."}
                  </p>
                </div>
              </div>
            </div>

            {!isEditMode ? (
              <div className="dashboard-form-card dashboard-field">
                <label className="dashboard-field-label">Descripción</label>
                <Textarea
                  rows={4}
                  placeholder="Detalle del gasto…"
                  className="rounded-2xl border-border/70 bg-background"
                  {...register("description")}
                  disabled={isPending}
                />
                {errors.description && (
                  <p className="dashboard-field-error">{errors.description.message}</p>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="dashboard-dialog-footer">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl" disabled={!isValid || isPending}>
              {isPending ? "Guardando…" : isEditMode ? "Actualizar cuenta" : "Guardar gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
