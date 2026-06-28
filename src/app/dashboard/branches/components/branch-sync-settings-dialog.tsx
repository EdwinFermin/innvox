"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateBranchSyncSettings } from "@/actions/branches";
import { BankAccountOptionContent } from "@/components/bank-account-option-content";
import { FormDialog } from "@/components/ui/form-dialog";
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
import type { Branch } from "@/types/branch.types";

const NONE_VALUE = "__none__";

const ENVIOSRD_KEYS = [
  { value: "altagracia", label: "altagracia" },
  { value: "independencia", label: "independencia" },
  { value: "salcedo", label: "salcedo" },
] as const;

const schema = z.object({
  default_cash_account_id: z.string(),
  enviosrd_branch_key: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface BranchSyncSettingsDialogProps {
  branch: Branch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchSyncSettingsDialog({
  branch,
  open,
  onOpenChange,
}: BranchSyncSettingsDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: bankAccounts } = useBankAccounts(user?.id || "");

  const pettyCashOptions = React.useMemo(
    () =>
      bankAccounts.filter(
        (account) =>
          account.account_type === "petty_cash" && accountSupportsBranch(account, branch.id),
      ),
    [bankAccounts, branch.id],
  );

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      default_cash_account_id: branch.default_cash_account_id ?? NONE_VALUE,
      enviosrd_branch_key: branch.enviosrd_branch_key ?? NONE_VALUE,
    },
  });

  React.useEffect(() => {
    reset({
      default_cash_account_id: branch.default_cash_account_id ?? NONE_VALUE,
      enviosrd_branch_key: branch.enviosrd_branch_key ?? NONE_VALUE,
    });
  }, [branch, reset, open]);

  const cashValue = watch("default_cash_account_id");
  const keyValue = watch("enviosrd_branch_key");

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      await updateBranchSyncSettings({
        id: branch.id,
        default_cash_account_id:
          values.default_cash_account_id === NONE_VALUE
            ? null
            : values.default_cash_account_id,
        enviosrd_branch_key:
          values.enviosrd_branch_key === NONE_VALUE ? null : values.enviosrd_branch_key,
      });
    },
    onSuccess: () => {
      toast.success("Configuración actualizada");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Error al actualizar la configuración.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configuración de sincronización"
      description={`Define la cuenta de caja por defecto y la clave de Envios RD para ${branch.name}.`}
      contentClassName="max-h-[90vh] max-w-lg overflow-y-auto"
      onSubmit={onSubmit}
      isSubmitting={isPending}
      canSubmit={isDirty}
      submitLabel="Guardar"
    >
            <div className="dashboard-form-card grid gap-4">
              <div className="dashboard-field">
                <label className="dashboard-field-label">Cuenta de caja por defecto</label>
                <Select
                  value={cashValue}
                  onValueChange={(val) =>
                    setValue("default_cash_account_id", val, { shouldDirty: true })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Sin configurar</SelectItem>
                    {pettyCashOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <BankAccountOptionContent account={account} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pettyCashOptions.length === 0 && (
                  <p className="dashboard-field-hint">
                    No hay cuentas de tipo caja asociadas a esta sucursal.
                  </p>
                )}
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Clave Envios RD</label>
                <Select
                  value={keyValue}
                  onValueChange={(val) =>
                    setValue("enviosrd_branch_key", val, { shouldDirty: true })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
                    <SelectValue placeholder="Selecciona la sucursal en Envios RD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Sin configurar</SelectItem>
                    {ENVIOSRD_KEYS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="dashboard-field-hint">
                  Cada clave solo puede usarse en una sucursal.
                </p>
              </div>
            </div>
    </FormDialog>
  );
}
