"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { Checkbox } from "@/components/ui/checkbox";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useConfigs } from "@/hooks/use-configs";
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
  const { data: configs } = useConfigs();
  const allowedBranchIds =
    user?.type === "USER" ? user?.branch_ids : undefined;
  const { data: allAccounts } = useBankAccounts(user?.id || "", {
    allowedBranchIds,
    activeOnly: true,
  });

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
      setIncludeLBTR(false);
      setIncludeTransferTax(false);
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

  const watchedAmount = watch("amount");
  const currentAmount = React.useMemo(() => Number(watchedAmount) || 0, [watchedAmount]);

  const computedLBTR = includeLBTR ? lbtrFeeAmount : 0;
  const computedTax = includeTransferTax
    ? Math.round(currentAmount * (transferTaxPercentage / 100) * 100) / 100
    : 0;
  const totalDeduction = currentAmount + computedLBTR + computedTax;

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      if (!user?.id)
        throw new Error("No se encontro el usuario autenticado.");

      const lbtr = includeLBTR ? lbtrFeeAmount : 0;
      const tax = includeTransferTax
        ? Math.round(values.amount * (transferTaxPercentage / 100) * 100) / 100
        : 0;
      const total = values.amount + lbtr + tax;

      if (total > account.current_balance)
        throw new Error("El monto total (incluyendo comisiones) excede el balance disponible.");

      await transferFunds({
        sourceAccountId: account.id,
        destAccountId: values.destinationAccountId,
        amount: values.amount,
        description: values.description,
        lbtrFee: lbtr > 0 ? lbtr : undefined,
        transferTax: tax > 0 ? tax : undefined,
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

  const formatCurrency = React.useCallback(
    (value: number, cur: string) =>
      new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: cur,
      }).format(value),
    [],
  );

  const formatBalance = formatCurrency(account.current_balance, account.currency);

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

          {(lbtrFeeAmount > 0 || transferTaxPercentage > 0) ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Comisiones</p>

              {lbtrFeeAmount > 0 ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeLBTR"
                    checked={includeLBTR}
                    onCheckedChange={(checked) => setIncludeLBTR(checked === true)}
                    disabled={isPending}
                  />
                  <label htmlFor="includeLBTR" className="text-sm cursor-pointer">
                    Incluir comision LBTR ({formatCurrency(lbtrFeeAmount, account.currency)})
                  </label>
                </div>
              ) : null}

              {transferTaxPercentage > 0 ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="includeTransferTax"
                    checked={includeTransferTax}
                    onCheckedChange={(checked) => setIncludeTransferTax(checked === true)}
                    disabled={isPending}
                  />
                  <label htmlFor="includeTransferTax" className="text-sm cursor-pointer">
                    Incluir impuesto de transferencia ({transferTaxPercentage}%)
                  </label>
                </div>
              ) : null}

              {(computedLBTR > 0 || computedTax > 0) && currentAmount > 0 ? (
                <div className="space-y-1 border-t pt-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Monto de transferencia</span>
                    <span>{formatCurrency(currentAmount, account.currency)}</span>
                  </div>
                  {computedLBTR > 0 ? (
                    <div className="flex justify-between">
                      <span>Comision LBTR</span>
                      <span>+{formatCurrency(computedLBTR, account.currency)}</span>
                    </div>
                  ) : null}
                  {computedTax > 0 ? (
                    <div className="flex justify-between">
                      <span>Impuesto ({transferTaxPercentage}%)</span>
                      <span>+{formatCurrency(computedTax, account.currency)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-medium text-foreground border-t pt-1">
                    <span>Total a debitar</span>
                    <span>{formatCurrency(totalDeduction, account.currency)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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
