"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { adjustBalance } from "@/actions/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { BankAccount } from "@/types/bank-account.types";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  newBalance: z.coerce.number(),
  description: z.string().min(1, "La descripcion del ajuste es obligatoria"),
});

type Values = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

interface AdjustBalanceDialogProps {
  account: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustBalanceDialog({
  account,
  open,
  onOpenChange,
}: AdjustBalanceDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      newBalance: account.current_balance ?? 0,
      description: "",
    },
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      reset({
        newBalance: account.current_balance ?? 0,
        description: "",
      });
    }
  }, [open, account.current_balance, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      if (!user?.id)
        throw new Error("No se encontro el usuario autenticado.");

      await adjustBalance({
        bankAccountId: account.id,
        targetBalance: values.newBalance,
        description: values.description,
      });
    },
    onSuccess: () => {
      toast.success("Balance ajustado exitosamente");
      queryClient.invalidateQueries({
        queryKey: ["bankAccount", account.id],
      });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({
        queryKey: ["bankTransactions"],
      });
      onOpenChange(false);
    },
    onError: (error: Error) =>
      toast.error(error.message || "Ocurrio un error inesperado."),
  });

  const formatBalance = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: account.currency,
  }).format(account.current_balance);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajustar balance"
      description={`Cuenta: ${account.account_name} \u00B7 Balance actual: ${formatBalance}`}
      contentClassName="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto"
      onSubmit={handleSubmit((values) => mutate(values as Values))}
      isSubmitting={isPending}
      canSubmit={isValid}
      submitLabel="Aplicar ajuste"
      submittingLabel="Guardando..."
      footer={
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" disabled={!isValid || isPending}>
            {isPending ? "Guardando..." : "Aplicar ajuste"}
          </Button>
        </div>
      }
    >
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nuevo balance
            </label>
            <Input
              type="number"
              step="0.01"
              {...register("newBalance", { valueAsNumber: true })}
              disabled={isPending}
            />
            {errors.newBalance ? (
              <p className="text-xs text-red-500">
                {errors.newBalance.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Descripcion del ajuste
            </label>
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
    </FormDialog>
  );
}
