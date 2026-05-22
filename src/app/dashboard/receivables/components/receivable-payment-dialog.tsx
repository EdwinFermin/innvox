"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { payReceivable } from "@/actions/receivables";
import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useIncomeTypes } from "@/hooks/use-income-types";
import { accountSupportsBranch } from "@/lib/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { Receivable } from "@/types/receivable.types";
import { getTodayDateKey } from "@/utils/dates";

interface ReceivablePaymentDialogProps {
  receivable: Receivable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivablePaymentDialog({
  receivable,
  open,
  onOpenChange,
}: ReceivablePaymentDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: incomeTypes } = useIncomeTypes(user?.id || "");
  const { data: bankAccounts } = useBankAccounts(user?.id || "");

  const outstanding = receivable
    ? receivable.amount - receivable.paid_amount
    : 0;

  const schema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce
          .number()
          .positive("El monto debe ser mayor a 0")
          .max(outstanding, "El cobro excede el saldo pendiente"),
        incomeTypeId: z.string().min(1, "El tipo de ingreso es obligatorio"),
        bankAccountId: z.string().min(1, "La cuenta financiera es obligatoria"),
        date: z.string().min(1, "La fecha es obligatoria"),
      }),
    [outstanding],
  );

  type Values = z.infer<typeof schema>;
  type FormValues = z.input<typeof schema>;

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
      amount: outstanding,
      incomeTypeId: "",
      bankAccountId: "",
      date: getTodayDateKey(),
    },
  });

  React.useEffect(() => {
    if (open && receivable) {
      reset({
        amount: receivable.amount - receivable.paid_amount,
        incomeTypeId: "",
        bankAccountId: "",
        date: getTodayDateKey(),
      });
    }
  }, [open, receivable, reset]);

  const branchId = receivable?.branch_id ?? undefined;
  const selectedAccountId = watch("bankAccountId");

  const availableAccounts = React.useMemo(
    () => bankAccounts.filter((account) => accountSupportsBranch(account, branchId)),
    [bankAccounts, branchId],
  );

  const selectedAccount = React.useMemo(
    () => availableAccounts.find((account) => account.id === selectedAccountId) ?? null,
    [availableAccounts, selectedAccountId],
  );

  React.useEffect(() => {
    if (availableAccounts.length === 1 && !selectedAccountId) {
      setValue("bankAccountId", availableAccounts[0].id, { shouldValidate: true });
    }
  }, [availableAccounts, selectedAccountId, setValue]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      if (!user?.id) throw new Error("No se encontro el usuario autenticado.");
      if (!receivable) throw new Error("No se encontro la cuenta por cobrar.");

      await payReceivable({
        receivableId: receivable.id,
        amount: values.amount,
        incomeTypeId: values.incomeTypeId,
        bankAccountId: values.bankAccountId,
        date: values.date,
      });
    },
    onSuccess: () => {
      toast.success("Cobro registrado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      onOpenChange(false);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Ocurrio un error inesperado."),
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Registrar cobro
          </DialogTitle>
          <DialogDescription>
            {receivable ? (
              <>
                {receivable.name}
                {" · "}
                Total: {formatCurrency(receivable.amount)}
                {" · "}
                Abonado: {formatCurrency(receivable.paid_amount)}
                {" · "}
                Pendiente:{" "}
                <span className="font-medium">{formatCurrency(outstanding)}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutate(values as Values))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Monto del cobro</label>
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
            <label className="text-sm font-medium">Tipo de ingreso</label>
            <Select
              value={watch("incomeTypeId")}
              onValueChange={(val) =>
                setValue("incomeTypeId", val, { shouldValidate: true })
              }
              disabled={isPending}
            >
              <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {incomeTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.incomeTypeId ? (
              <p className="text-xs text-red-500">{errors.incomeTypeId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cuenta financiera</label>
            <Select
              value={selectedAccountId}
              onValueChange={(val) =>
                setValue("bankAccountId", val, { shouldValidate: true })
              }
              disabled={isPending}
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
            {errors.bankAccountId ? (
              <p className="text-xs text-red-500">{errors.bankAccountId.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha</label>
            <Input
              type="date"
              max={getTodayDateKey()}
              {...register("date")}
              disabled={isPending}
            />
            {errors.date ? (
              <p className="text-xs text-red-500">{errors.date.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Procesando..." : "Registrar cobro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
