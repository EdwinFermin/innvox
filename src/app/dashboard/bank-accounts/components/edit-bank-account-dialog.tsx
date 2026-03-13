"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useBranches } from "@/hooks/use-branches";
import {
  removeBankAccountLogo,
  uploadBankAccountLogo,
} from "@/lib/bank-account-logo";
import {
  getBankAccountBranchIds,
  isSafeAccountImageSrc,
} from "@/lib/bank-accounts";
import { updateBankAccount } from "@/actions/bank-accounts";
import { useAuthStore } from "@/store/auth";
import { Branch } from "@/types/branch.types";
import { BankAccount, Currency } from "@/types/bank-account.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
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

const schema = z
  .object({
    branchIds: z.array(z.string()).default([]),
    pettyCashBranchId: z.string().optional(),
    accountName: z.string().min(1, "El nombre de la cuenta es obligatorio"),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    currency: z.enum(["DOP", "USD"]),
    isActive: z.enum(["true", "false"]),
    isPublic: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.branchIds.length === 0 && !data.pettyCashBranchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona al menos una sucursal",
        path: ["branchIds"],
      });
    }
    if (
      data.branchIds.length > 0 &&
      !data.bankName?.trim() &&
      !data.pettyCashBranchId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "El nombre del banco es obligatorio para cuentas bancarias",
        path: ["bankName"],
      });
    }
  });

type Values = z.infer<typeof schema>;
type FormValues = z.input<typeof schema>;

interface EditBankAccountDialogProps {
  account: BankAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBankAccountDialog({
  account,
  open,
  onOpenChange,
}: EditBankAccountDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const allowedBranchIds =
    user?.type === "USER" ? user?.branch_ids : undefined;
  const { data: branches } = useBranches(
    user?.id || "",
    allowedBranchIds,
  );
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [removeLogo, setRemoveLogo] = React.useState(false);
  const logoInputId = React.useId();

  const isBankAccount = account.account_type === "bank";

  const initialValues = React.useMemo<FormValues>(() => {
    const ids = getBankAccountBranchIds(account);
    return {
      branchIds: isBankAccount ? ids : [],
      pettyCashBranchId: isBankAccount ? "" : ids[0] ?? "",
      accountName: account.account_name ?? "",
      bankName: account.bank_name ?? "",
      accountNumber: account.account_number ?? "",
      currency: (account.currency ?? "DOP") as Currency,
      isActive: account.is_active ? "true" : "false",
      isPublic: account.is_public !== false,
    };
  }, [account, isBankAccount]);

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
    defaultValues: initialValues,
  });

  // Reset form when dialog opens or account changes
  React.useEffect(() => {
    if (open) {
      reset(initialValues);
      setPreviewUrl(account.icon_url ?? null);
      setLogoFile(null);
      setRemoveLogo(false);
    }
  }, [open, account.icon_url, initialValues, reset]);

  const selectedBranchIds = watch("branchIds") ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: Values) => {
      const nextBranchIds = isBankAccount
        ? values.branchIds
        : [values.pettyCashBranchId!];
      let iconUrl = account.icon_url ?? null;
      if (removeLogo && account.icon_url) {
        await removeBankAccountLogo();
        iconUrl = null;
      }
      if (logoFile) {
        iconUrl = await uploadBankAccountLogo(account.id, logoFile);
      }
      await updateBankAccount(account.id, {
        branchIds: nextBranchIds,
        accountName: values.accountName,
        bankName: isBankAccount
          ? values.bankName?.trim() || null
          : null,
        accountNumber: isBankAccount
          ? values.accountNumber?.trim() || null
          : null,
        currency: values.currency,
        isActive: values.isActive === "true",
        isPublic: isBankAccount ? values.isPublic : false,
        iconUrl,
      });
    },
    onSuccess: () => {
      toast.success("Cuenta actualizada");
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({
        queryKey: ["bankAccount", account.id],
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Ocurrio un error inesperado.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Editar cuenta financiera
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutate(values as Values))}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tipo de cuenta
              </label>
              <Input
                value={
                  isBankAccount ? "Cuenta bancaria" : "Caja"
                }
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Moneda</label>
              <Select
                value={watch("currency")}
                onValueChange={(val: Currency) =>
                  setValue("currency", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOP">DOP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre de la cuenta
            </label>
            <Input {...register("accountName")} disabled={isPending} />
            {errors.accountName ? (
              <p className="text-xs text-red-500">
                {errors.accountName.message}
              </p>
            ) : null}
          </div>

          {isBankAccount ? (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Sucursales asociadas
              </label>
              <div className="grid gap-2 max-h-48 overflow-auto rounded-md border p-3">
                {branches.map((branch: Branch) => (
                  <label
                    key={branch.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedBranchIds.includes(branch.id)}
                      onCheckedChange={() => {
                        const current = new Set(selectedBranchIds);
                        if (current.has(branch.id)) {
                          current.delete(branch.id);
                        } else {
                          current.add(branch.id);
                        }
                        setValue("branchIds", Array.from(current), {
                          shouldValidate: true,
                        });
                      }}
                      disabled={isPending}
                    />
                    <span>
                      {branch.name} ({branch.code})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={watch("pettyCashBranchId")}
                onValueChange={(val) =>
                  setValue("pettyCashBranchId", val, {
                    shouldValidate: true,
                  })
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isBankAccount ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Banco</label>
                <Input
                  {...register("bankName")}
                  disabled={isPending}
                />
                {errors.bankName ? (
                  <p className="text-xs text-red-500">
                    {errors.bankName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Numero de cuenta
                </label>
                <Input
                  {...register("accountNumber")}
                  disabled={isPending}
                />
              </div>
            </div>
          ) : null}

          {isBankAccount && (
            <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={watch("isPublic")}
                onCheckedChange={(val) =>
                  setValue("isPublic", !!val, { shouldValidate: true })
                }
                disabled={isPending}
              />
              <div>
                <p className="text-sm font-medium">Visible en portal público</p>
                <p className="text-xs text-muted-foreground">
                  Si está activo, esta cuenta aparecerá en la página pública de cuentas bancarias de la sucursal.
                </p>
              </div>
            </label>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Icono o logo</label>
            <div className="rounded-xl border border-dashed bg-muted/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isSafeAccountImageSrc(previewUrl) ? (
                    <img
                      src={previewUrl!}
                      alt="Logo de cuenta"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
                        Logo
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    id={logoInputId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isPending}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0] ?? null;
                      setLogoFile(file);
                      setRemoveLogo(false);
                      setPreviewUrl(
                        file
                          ? URL.createObjectURL(file)
                          : account.icon_url ?? null,
                      );
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document
                          .getElementById(logoInputId)
                          ?.click()
                      }
                      disabled={isPending}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {previewUrl
                        ? "Cambiar imagen"
                        : "Seleccionar imagen"}
                    </Button>
                    {previewUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setLogoFile(null);
                          setRemoveLogo(true);
                          setPreviewUrl(null);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
