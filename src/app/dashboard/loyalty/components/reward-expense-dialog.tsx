"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { completeLoyaltyReward } from "@/actions/loyalty";
import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { accountSupportsBranch } from "@/lib/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { Client } from "@/types/client.types";

const schema = z.object({
  amount: z.coerce.number().positive("El monto es obligatorio"),
  bankAccountId: z.string().min(1, "La cuenta es obligatoria"),
});

type FormValues = z.input<typeof schema>;
type RewardResult = Awaited<ReturnType<typeof completeLoyaltyReward>>;

interface RewardExpenseDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: RewardResult) => void;
}

export function RewardExpenseDialog({
  client,
  open,
  onOpenChange,
  onCompleted,
}: RewardExpenseDialogProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: bankAccounts } = useBankAccounts(user?.id || "");

  const allowedBranchIds = React.useMemo(
    () => user?.branch_ids ?? [],
    [user?.branch_ids],
  );

  const availableAccounts = React.useMemo(() => {
    if (allowedBranchIds.length === 0) return bankAccounts;

    return bankAccounts.filter((account) =>
      allowedBranchIds.some((branchId) => accountSupportsBranch(account, branchId)),
    );
  }, [allowedBranchIds, bankAccounts]);

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
      amount: 0,
      bankAccountId: "",
    },
  });

  const selectedAccountId = watch("bankAccountId");
  const selectedAccount = React.useMemo(
    () => availableAccounts.find((account) => account.id === selectedAccountId) ?? null,
    [availableAccounts, selectedAccountId],
  );

  const description = client
    ? `Recompenza programa de fidelidad - ${client.name}-${client.po_box || client.id}`
    : "Recompenza programa de fidelidad";

  const rewardMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!client) throw new Error("No hay cliente seleccionado");

      return completeLoyaltyReward({
        clientId: client.id,
        amount: Number(values.amount),
        bankAccountId: values.bankAccountId,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-clients"] });
      queryClient.invalidateQueries({ queryKey: ["token-history"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });

      toast.success("Recompensa registrada y tarjeta reiniciada");
      reset();
      onCompleted?.(result);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al registrar la recompensa",
      );
    },
  });

  const onSubmit = handleSubmit((values) => rewardMutation.mutate(values));

  React.useEffect(() => {
    if (!open) return;

    reset({
      amount: 0,
      bankAccountId: availableAccounts.length === 1 ? availableAccounts[0].id : "",
    });
  }, [availableAccounts, open, reset]);

  if (!client) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Crear gasto de recompensa"
      description={`${client.name} completó 10 tokens. Registra el gasto antes de reiniciar la tarjeta.`}
      contentClassName="dashboard-dialog-content max-w-lg"
      onSubmit={onSubmit}
      isSubmitting={rewardMutation.isPending}
      canSubmit={isValid}
      submitLabel="Crear gasto y reiniciar"
      submittingLabel="Procesando..."
      footer={
        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 sm:px-7">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            disabled={rewardMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="rounded-2xl"
            disabled={!isValid || rewardMutation.isPending}
          >
            {rewardMutation.isPending ? "Procesando..." : "Crear gasto y reiniciar"}
          </Button>
        </DialogFooter>
      }
    >
            <div className="dashboard-form-card grid gap-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="font-medium">{description}</div>
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Monto</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  disabled={rewardMutation.isPending}
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="dashboard-field-error">{errors.amount.message}</p>
                )}
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Cuenta financiera</label>
                <Select
                  value={selectedAccountId}
                  onValueChange={(value) =>
                    setValue("bankAccountId", value, { shouldValidate: true })
                  }
                  disabled={rewardMutation.isPending}
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
            </div>
    </FormDialog>
  );
}
