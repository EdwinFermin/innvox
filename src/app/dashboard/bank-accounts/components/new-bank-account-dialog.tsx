"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, PlusCircle, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createBankAccount } from "@/actions/bank-accounts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
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
import { useBranches } from "@/hooks/use-branches";
import { uploadBankAccountLogo } from "@/lib/bank-account-logo";
import { useAuthStore } from "@/store/auth";
import { AccountType, Currency } from "@/types/bank-account.types";

const newBankAccountSchema = z
  .object({
    branchIds: z.array(z.string()).default([]),
    pettyCashBranchId: z.string().optional(),
    accountType: z.enum(["bank", "petty_cash"], {
      error: "El tipo de cuenta es obligatorio",
    }),
    accountName: z.string().min(1, "El nombre de la cuenta es obligatorio"),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    currency: z.enum(["DOP", "USD"], {
      error: "La moneda es obligatoria",
    }),
    initialBalance: z.coerce.number().min(0, "El balance inicial debe ser 0 o mayor"),
    isPublic: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "bank") {
      if (!data.bankName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del banco es obligatorio para cuentas bancarias",
          path: ["bankName"],
        });
      }

      if (data.branchIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona al menos una sucursal",
          path: ["branchIds"],
        });
      }
    }

    if (data.accountType === "petty_cash" && !data.pettyCashBranchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La sucursal es obligatoria para la caja chica",
        path: ["pettyCashBranchId"],
      });
    }
  });

type NewBankAccountValues = z.infer<typeof newBankAccountSchema>;
type NewBankAccountFormValues = z.input<typeof newBankAccountSchema>;

export function NewBankAccountDialog() {
  const [open, setOpen] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const logoInputId = React.useId();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );

  const initialValues = React.useMemo<NewBankAccountFormValues>(
    () => ({
      accountType: "bank",
      branchIds: [],
      pettyCashBranchId: "",
      currency: "DOP",
      initialBalance: 0,
      accountName: "",
      bankName: "",
      accountNumber: "",
      isPublic: true,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<NewBankAccountFormValues>({
    resolver: zodResolver(newBankAccountSchema),
    mode: "onChange",
    defaultValues: initialValues,
  });

  const accountType = watch("accountType");
  const selectedBranchIds = watch("branchIds") ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewBankAccountValues) => {
      if (!user?.id) {
        throw new Error("No se encontro el usuario autenticado.");
      }

      const branchIds =
        data.accountType === "bank" ? data.branchIds : [data.pettyCashBranchId!];

      let iconUrl: string | null = null;
      if (logoFile) {
        const tempId = crypto.randomUUID();
        iconUrl = await uploadBankAccountLogo(tempId, logoFile);
      }

      await createBankAccount({
        branchIds,
        accountType: data.accountType,
        accountName: data.accountName,
        bankName: data.accountType === "bank" ? data.bankName?.trim() || null : null,
        accountNumber:
          data.accountType === "bank" ? data.accountNumber?.trim() || null : null,
        currency: data.currency,
        iconUrl,
        currentBalance: Number(data.initialBalance),
        isActive: true,
        isPublic: data.accountType === "bank" ? data.isPublic : false,
      });
    },
    onSuccess: () => {
      toast.success("Cuenta creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      setOpen(false);
      reset(initialValues);
      setLogoFile(null);
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrio un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewBankAccountValues));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => {
            reset(initialValues);
            setLogoFile(null);
            setPreviewUrl(null);
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva cuenta
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Nueva cuenta
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            Configura una cuenta bancaria o caja, define cobertura por sucursal y deja lista su disponibilidad operativa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="dashboard-form-card grid gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Tipo de cuenta</label>
                  <Select
                    value={accountType}
                    onValueChange={(val: AccountType) => {
                      setValue("accountType", val, { shouldValidate: true });
                      if (val === "petty_cash") {
                        setValue("branchIds", [], { shouldValidate: true });
                      } else {
                        setValue("pettyCashBranchId", "", { shouldValidate: true });
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Cuenta bancaria</SelectItem>
                      <SelectItem value="petty_cash">Caja</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.accountType && (
                    <p className="dashboard-field-error">{errors.accountType.message}</p>
                  )}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Moneda</label>
                  <Select
                    value={watch("currency")}
                    onValueChange={(val: Currency) =>
                      setValue("currency", val, { shouldValidate: true })
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
                      <SelectValue placeholder="Selecciona la moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOP">DOP (Peso Dominicano)</SelectItem>
                      <SelectItem value="USD">USD (Dolar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.currency && (
                    <p className="dashboard-field-error">{errors.currency.message}</p>
                  )}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Nombre de la cuenta</label>
                  <Input
                    placeholder={
                      accountType === "petty_cash"
                        ? "Ej. Caja principal…"
                        : "Ej. Cuenta operativa…"
                    }
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("accountName")}
                    disabled={isPending}
                  />
                  {errors.accountName && (
                    <p className="dashboard-field-error">{errors.accountName.message}</p>
                  )}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Balance inicial</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("initialBalance")}
                    disabled={isPending}
                  />
                  {errors.initialBalance && (
                    <p className="dashboard-field-error">{errors.initialBalance.message}</p>
                  )}
                </div>
              </div>

              <div className="dashboard-form-card space-y-4">
                {accountType === "bank" ? (
                  <>
                    <div>
                      <div className="dashboard-field-label">Sucursales asociadas</div>
                      <p className="dashboard-field-hint mt-1">
                        Elige las sucursales donde esta cuenta estará disponible.
                      </p>
                    </div>
                    <div className="grid max-h-48 gap-2 overflow-auto rounded-[1rem] border border-border/70 bg-background/85 p-3">
                      {branches.map((branch) => (
                        <label
                          key={branch.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
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
                    {errors.branchIds && (
                      <p className="dashboard-field-error">{errors.branchIds.message as string}</p>
                    )}
                  </>
                ) : (
                  <div className="dashboard-field">
                    <label className="dashboard-field-label">Sucursal</label>
                    <Select
                      value={watch("pettyCashBranchId")}
                      onValueChange={(val) =>
                        setValue("pettyCashBranchId", val, { shouldValidate: true })
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
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
                    {errors.pettyCashBranchId && (
                      <p className="dashboard-field-error">{errors.pettyCashBranchId.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {accountType === "bank" && (
              <div className="dashboard-form-card grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Banco</label>
                  <Input
                    placeholder="Ej. Banco Popular…"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("bankName")}
                    disabled={isPending}
                  />
                  {errors.bankName && (
                    <p className="dashboard-field-error">{errors.bankName.message}</p>
                  )}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Numero de cuenta</label>
                  <Input
                    placeholder="Ej. 123456789…"
                    className="h-11 rounded-2xl border-border/70 bg-background font-mono"
                    {...register("accountNumber")}
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_18rem]">
              <div className="dashboard-form-card space-y-3">
                <label className="dashboard-field-label">Icono o logo</label>
                <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm">
                      {previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewUrl}
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
                      <div>
                        <p className="text-sm font-medium">Imagen de la cuenta</p>
                        <p className="text-xs text-muted-foreground">
                          Opcional. Se mostrará en la lista y en el detalle de la cuenta.
                        </p>
                      </div>

                      <input
                        id={logoInputId}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isPending}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setLogoFile(file);
                          setPreviewUrl(file ? URL.createObjectURL(file) : null);
                        }}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => document.getElementById(logoInputId)?.click()}
                          disabled={isPending}
                        >
                          <ImagePlus className="mr-2 h-4 w-4" />
                          {previewUrl ? "Cambiar imagen" : "Seleccionar imagen"}
                        </Button>

                        {previewUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-2xl"
                            onClick={() => {
                              setLogoFile(null);
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

              <div className="dashboard-form-card dashboard-field">
                <label className="dashboard-field-label">Resumen</label>
                <div className="dashboard-field-hint rounded-[1rem] border border-border/60 bg-background/80 p-4 leading-6">
                  La cuenta se creará activa con la moneda seleccionada y su balance inicial disponible para reportes y movimientos.
                </div>
              </div>
            </div>

            {accountType === "bank" && (
              <label className="dashboard-form-card flex cursor-pointer items-center gap-3 rounded-[1.25rem] hover:bg-muted/40">
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
          </div>

          <DialogFooter className="dashboard-dialog-footer">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-2xl">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-2xl" disabled={!isValid || isPending}>
              {isPending ? "Creando…" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
