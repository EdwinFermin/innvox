"use client";

import React from "react";
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
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { AccountType, Currency } from "@/types/bank-account.types";

const newBankAccountSchema = z
  .object({
    branchId: z.string().min(1, "La sucursal es obligatoria"),
    accountType: z.enum(["bank", "petty_cash"], {
      error: "El tipo de cuenta es obligatorio",
    }),
    accountName: z.string().min(1, "El nombre de la cuenta es obligatorio"),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    currency: z.enum(["DOP", "USD"], {
      error: "La moneda es obligatoria",
    }),
    initialBalance: z.number().min(0, "El balance inicial debe ser 0 o mayor"),
  })
  .refine(
    (data) => {
      if (data.accountType === "bank") {
        return data.bankName && data.bankName.length > 0;
      }
      return true;
    },
    {
      message: "El nombre del banco es obligatorio para cuentas bancarias",
      path: ["bankName"],
    }
  );

type NewBankAccountValues = z.infer<typeof newBankAccountSchema>;
type NewBankAccountFormValues = z.input<typeof newBankAccountSchema>;

export function NewBankAccountDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(user?.id || "");

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
    defaultValues: {
      currency: "DOP",
      initialBalance: 0,
    },
  });

  const accountType = watch("accountType");

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewBankAccountValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      const ref = collection(db, "bankAccounts");
      await addDoc(ref, {
        branchId: data.branchId,
        accountType: data.accountType,
        accountName: data.accountName,
        bankName: data.accountType === "bank" ? data.bankName : null,
        accountNumber: data.accountType === "bank" ? data.accountNumber : null,
        currency: data.currency,
        currentBalance: data.initialBalance,
        isActive: true,
        createdAt: new Date(),
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      toast.success("Cuenta creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewBankAccountValues));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva Cuenta
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Nueva Cuenta</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={watch("branchId")}
                onValueChange={(val) =>
                  setValue("branchId", val, { shouldValidate: true })
                }
                disabled={isPending}
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
                <p className="text-xs text-red-500">{errors.branchId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Cuenta</label>
              <Select
                value={watch("accountType")}
                onValueChange={(val: AccountType) =>
                  setValue("accountType", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Cuenta Bancaria</SelectItem>
                  <SelectItem value="petty_cash">Caja Chica</SelectItem>
                </SelectContent>
              </Select>
              {errors.accountType && (
                <p className="text-xs text-red-500">{errors.accountType.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de la Cuenta</label>
            <Input
              placeholder={
                accountType === "petty_cash"
                  ? "Ej. Caja Chica Principal"
                  : "Ej. Cuenta Operativa"
              }
              {...register("accountName")}
              disabled={isPending}
            />
            {errors.accountName && (
              <p className="text-xs text-red-500">{errors.accountName.message}</p>
            )}
          </div>

          {accountType === "bank" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco</label>
                  <Input
                    placeholder="Ej. Banco Popular"
                    {...register("bankName")}
                    disabled={isPending}
                  />
                  {errors.bankName && (
                    <p className="text-xs text-red-500">{errors.bankName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Número de Cuenta</label>
                  <Input
                    placeholder="Ej. 123456789"
                    {...register("accountNumber")}
                    disabled={isPending}
                  />
                  {errors.accountNumber && (
                    <p className="text-xs text-red-500">
                      {errors.accountNumber.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Moneda</label>
              <Select
                value={watch("currency")}
                onValueChange={(val: Currency) =>
                  setValue("currency", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona la moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOP">DOP (Peso Dominicano)</SelectItem>
                  <SelectItem value="USD">USD (Dólar)</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-xs text-red-500">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Balance Inicial</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("initialBalance")}
                disabled={isPending}
              />
              {errors.initialBalance && (
                <p className="text-xs text-red-500">
                  {errors.initialBalance.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={!isValid || isPending}
          >
            {isPending ? "Creando..." : "Crear Cuenta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
