"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { completeAlert } from "@/actions/operating-costs";
import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
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
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useConfigs } from "@/hooks/use-configs";
import { accountSupportsBranch } from "@/lib/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { OperatingCostAlert } from "@/types/operating-cost.types";

const schema = z.object({
  actualAmount: z.coerce.number().positive("Monto inválido"),
  bankAccountId: z.string().min(1, "La cuenta es obligatoria"),
});

type FormValues = z.input<typeof schema>;

interface Props {
  alert: OperatingCostAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteAlertDialog({ alert, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: configs } = useConfigs();
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
        currency: alert?.currency || "DOP",
      }).format(value),
    [alert?.currency],
  );

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
      bankAccountId: "",
    },
  });

  const selectedAccountId = watch("bankAccountId");

  const availableAccounts = React.useMemo(() => {
    if (!alert?.branch_id) return [];
    return bankAccounts.filter((account) =>
      accountSupportsBranch(account, alert.branch_id),
    );
  }, [bankAccounts, alert?.branch_id]);

  const selectedAccount = React.useMemo(
    () => availableAccounts.find((account) => account.id === selectedAccountId) ?? null,
    [availableAccounts, selectedAccountId],
  );

  const watchedAmount = watch("actualAmount");
  const currentAmount = React.useMemo(() => Number(watchedAmount) || 0, [watchedAmount]);

  const computedLBTR = includeLBTR ? lbtrFeeAmount : 0;
  const computedTax = includeTransferTax
    ? Math.round(currentAmount * (transferTaxPercentage / 100) * 100) / 100
    : 0;
  const totalDeduction = currentAmount + computedLBTR + computedTax;

  const invalidateAll = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["operatingCostAlerts"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
    queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
  }, [queryClient]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!alert) throw new Error("No hay alerta seleccionada");

      const lbtr = includeLBTR ? lbtrFeeAmount : 0;
      const tax = includeTransferTax
        ? Math.round(Number(data.actualAmount) * (transferTaxPercentage / 100) * 100) / 100
        : 0;

      await completeAlert({
        alertId: alert.id,
        actualAmount: Number(data.actualAmount),
        bankAccountId: data.bankAccountId,
        lbtrFee: lbtr > 0 ? lbtr : undefined,
        transferTax: tax > 0 ? tax : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Alerta completada y gasto generado");
      invalidateAll();
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const { mutate: mutateSkip, isPending: isSkipping } = useMutation({
    mutationFn: async () => {
      if (!alert) throw new Error("No hay alerta seleccionada");

      await completeAlert({
        alertId: alert.id,
        actualAmount: alert.default_amount,
        skipExpense: true,
      });
    },
    onSuccess: () => {
      toast.success("Alerta completada (sin gasto)");
      invalidateAll();
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const isBusy = isPending || isSkipping;

  const onSubmit = handleSubmit((values) => mutate(values));

  // Auto-select when only one option is available
  React.useEffect(() => {
    if (availableAccounts.length === 1 && !selectedAccountId) {
      setValue("bankAccountId", availableAccounts[0].id, { shouldValidate: true });
    }
  }, [availableAccounts, selectedAccountId, setValue]);

  React.useEffect(() => {
    if (!open) return;

    setIncludeLBTR(false);
    setIncludeTransferTax(false);

    if (alert) {
      reset({
        actualAmount: alert.default_amount,
        bankAccountId: "",
      });
    }
  }, [alert, open, reset]);

  if (!alert) return null;

  const canEditAmount = alert.allows_custom_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog-content max-h-[90vh] gap-0 overflow-y-auto sm:max-w-xl">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Completar pago
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            Genera el gasto automáticamente al completar esta alerta de costo operativo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="dashboard-form-card grid gap-4">
              <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="text-sm font-medium">{alert.operating_cost_name}</div>
                <div className="text-xs text-muted-foreground">
                  Vencimiento: {new Date(alert.due_date + "T00:00:00").toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">
                  Monto {canEditAmount ? "" : "(fijo)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("actualAmount")}
                  disabled={isBusy || !canEditAmount}
                />
                {canEditAmount && (
                  <p className="dashboard-field-hint">
                    Este costo permite ajustar el monto al momento del pago.
                  </p>
                )}
                {errors.actualAmount && <p className="dashboard-field-error">{errors.actualAmount.message}</p>}
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Cuenta financiera</label>
                <Select
                  value={selectedAccountId}
                  onValueChange={(val) => setValue("bankAccountId", val, { shouldValidate: true })}
                  disabled={isBusy}
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

              {(lbtrFeeAmount > 0 || transferTaxPercentage > 0) ? (
                <div className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-medium">Comisiones</p>

                  {lbtrFeeAmount > 0 ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="alertIncludeLBTR"
                        checked={includeLBTR}
                        onCheckedChange={(checked) => setIncludeLBTR(checked === true)}
                        disabled={isBusy}
                      />
                      <label htmlFor="alertIncludeLBTR" className="text-sm cursor-pointer">
                        Incluir comision LBTR ({formatCurrency(lbtrFeeAmount)})
                      </label>
                    </div>
                  ) : null}

                  {transferTaxPercentage > 0 ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="alertIncludeTransferTax"
                        checked={includeTransferTax}
                        onCheckedChange={(checked) => setIncludeTransferTax(checked === true)}
                        disabled={isBusy}
                      />
                      <label htmlFor="alertIncludeTransferTax" className="text-sm cursor-pointer">
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
            </div>
          </div>

          <div className="border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={isBusy}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl"
                disabled={isBusy}
                onClick={() => mutateSkip()}
              >
                {isSkipping ? "Procesando…" : "Completar sin gasto"}
              </Button>
              <Button type="submit" className="rounded-2xl" disabled={!isValid || isBusy}>
                {isPending ? "Procesando…" : "Completar y generar gasto"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
