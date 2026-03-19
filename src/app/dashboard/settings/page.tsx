"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import z from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useConfigs } from "@/hooks/use-configs";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateConfigs } from "@/actions/configs";

const settingsSchema = z.object({
  NCFRangeStart: z
    .string()
    .nonempty("El numero de comprobante fiscal inicial es obligatorio"),
  NCFRangeEnd: z
    .string()
    .nonempty("El numero de comprobante fiscal final es obligatorio"),
  CFRangeStart: z
    .string()
    .nonempty("El numero de consumidor final inicial es obligatorio"),
  CFRangeEnd: z
    .string()
    .nonempty("El numero de consumidor final final es obligatorio"),
  ITBISPercentage: z.string().nonempty("El porcentaje de ITBIS es obligatorio"),
  ExcentoPercentage: z
    .string()
    .nonempty("El porcentaje de Excento es obligatorio"),
  GravadoPercentage: z
    .string()
    .nonempty("El porcentaje de Gravado es obligatorio"),
  TransferTaxPercentage: z.string(),
  LBTRFee: z.string(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

const EMPTY_SETTINGS_VALUES: SettingsValues = {
  NCFRangeStart: "",
  NCFRangeEnd: "",
  CFRangeStart: "",
  CFRangeEnd: "",
  ITBISPercentage: "",
  ExcentoPercentage: "",
  GravadoPercentage: "",
  TransferTaxPercentage: "",
  LBTRFee: "",
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const canManageSettings = can(user?.type, PERMISSIONS.settingsManage);

  const queryClient = useQueryClient();
  const { data: configs, isLoading } = useConfigs();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: EMPTY_SETTINGS_VALUES,
  });

  const configValues = useMemo<SettingsValues | null>(() => {
    if (Object.keys(configs).length === 0) {
      return null;
    }

    const ncf = configs.NCF ?? {};
    const cf = configs.CF ?? {};
    const itbis = configs.ITBIS ?? {};
    const excento = configs.EXCENTO ?? {};
    const gravado = configs.GRAVADO ?? {};
    const transferTax = configs.TRANSFER_TAX ?? {};
    const lbtrFee = configs.LBTR_FEE ?? {};

    return {
      NCFRangeStart: String(ncf.range_start ?? ""),
      NCFRangeEnd: String(ncf.range_end ?? ""),
      CFRangeStart: String(cf.range_start ?? ""),
      CFRangeEnd: String(cf.range_end ?? ""),
      ITBISPercentage: String(itbis.percentage ?? ""),
      ExcentoPercentage: String(excento.percentage ?? ""),
      GravadoPercentage: String(gravado.percentage ?? ""),
      TransferTaxPercentage: String(transferTax.percentage ?? ""),
      LBTRFee: String(lbtrFee.amount ?? ""),
    };
  }, [configs]);

  useEffect(() => {
    if (configValues) {
      reset(configValues);
    }
  }, [configValues, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsValues) => {
      await updateConfigs({
        NCF: {
          range_start: values.NCFRangeStart,
          range_end: values.NCFRangeEnd,
        },
        CF: {
          range_start: values.CFRangeStart,
          range_end: values.CFRangeEnd,
        },
        ITBIS: { percentage: values.ITBISPercentage },
        EXCENTO: { percentage: values.ExcentoPercentage },
        GRAVADO: { percentage: values.GravadoPercentage },
        TRANSFER_TAX: { percentage: values.TransferTaxPercentage },
        LBTR_FEE: { amount: values.LBTRFee },
      });
    },
    onSuccess: () => {
      toast.success("Configuracion guardada");
      queryClient.invalidateQueries({ queryKey: ["configs"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Error al guardar la configuracion");
    },
  });

  const onSubmit = (values: SettingsValues) => {
    saveMutation.mutate(values);
  };

  if (!canManageSettings) {
    return (
      <div className="w-full">
        <h3 className="text-2xl font-semibold">Configuraciones Generales</h3>
        <p className="text-sm text-muted-foreground mt-2">
          No tienes permisos para acceder a esta seccion.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h3 className="text-2xl font-semibold">Configuraciones Generales</h3>
        <span className="text-muted-foreground text-sm">
          Gestiona toda la configuracion de tu cuenta y preferencias del sistema
        </span>
      </div>

      <div className="mx-auto h-full w-full max-w-3xl">
        <Separator className="my-4" />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={`grid gap-6`}>
            <h3 className="text-lg font-semibold">
              Rango de numeros para comprobantes fiscales
            </h3>

            <div className="grid gap-2">
              <label
                htmlFor="NCFRangeStart"
                className="text-sm font-medium text-start"
              >
                Numero inicial
              </label>
              <Input
                id="NCFRangeStart"
                disabled={isLoading}
                placeholder="Ingresa el numero inicial del rango"
                className="w-sm"
                {...register("NCFRangeStart")}
              />
              {errors.NCFRangeStart && (
                <p className="text-red-500 text-xs">
                  {errors.NCFRangeStart.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="NCFRangeEnd"
                className="text-sm font-medium text-start"
              >
                Numero final
              </label>
              <Input
                id="NCFRangeEnd"
                disabled={isLoading}
                placeholder="Ingresa el numero final del rango"
                className="w-sm"
                {...register("NCFRangeEnd")}
              />
              {errors.NCFRangeEnd && (
                <p className="text-red-500 text-xs">
                  {errors.NCFRangeEnd.message}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className={`grid gap-6`}>
            <h3 className="text-lg font-semibold">
              Rango de numeros para consumidor final
            </h3>

            <div className="grid gap-2">
              <label
                htmlFor="CFRangeStart"
                className="text-sm font-medium text-start"
              >
                Numero inicial
              </label>
              <Input
                id="CFRangeStart"
                disabled={isLoading}
                placeholder="Ingresa el numero inicial del rango"
                className="w-sm"
                {...register("CFRangeStart")}
              />
              {errors.CFRangeStart && (
                <p className="text-red-500 text-xs">
                  {errors.CFRangeStart.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="CFRangeEnd"
                className="text-sm font-medium text-start"
              >
                Numero final
              </label>
              <Input
                id="CFRangeEnd"
                disabled={isLoading}
                placeholder="Ingresa el numero final del rango"
                className="w-sm"
                {...register("CFRangeEnd")}
              />
              {errors.CFRangeEnd && (
                <p className="text-red-500 text-xs">
                  {errors.CFRangeEnd.message}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6">
            <h3 className="text-lg font-semibold">Porcentajes de facturas</h3>
            <div className="grid gap-2">
              <label
                htmlFor="ITBISPercentage"
                className="text-sm font-medium text-start"
              >
                Porcentaje de ITBIS
              </label>
              <Input
                id="ITBISPercentage"
                type="number"
                step="0.01"
                min="0"
                disabled={isLoading}
                placeholder="Ej: 18"
                className="w-sm"
                {...register("ITBISPercentage")}
              />
              {errors.ITBISPercentage && (
                <p className="text-red-500 text-xs">
                  {errors.ITBISPercentage.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="ExcentoPercentage"
                className="text-sm font-medium text-start"
              >
                Porcentage de Monto Exento
              </label>
              <Input
                id="ExcentoPercentage"
                type="number"
                step="0.01"
                min="0"
                disabled={isLoading}
                placeholder="Ej: 0"
                className="w-sm"
                {...register("ExcentoPercentage")}
              />
              {errors.ExcentoPercentage && (
                <p className="text-red-500 text-xs">
                  {errors.ExcentoPercentage.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="GravadoPercentage"
                className="text-sm font-medium text-start"
              >
                Porcentage de Monto Gravado
              </label>
              <Input
                id="GravadoPercentage"
                type="number"
                step="0.01"
                min="0"
                disabled={isLoading}
                placeholder="Ej: 100"
                className="w-sm"
                {...register("GravadoPercentage")}
              />
              {errors.GravadoPercentage && (
                <p className="text-red-500 text-xs">
                  {errors.GravadoPercentage.message}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6">
            <h3 className="text-lg font-semibold">Comisiones de transferencia</h3>
            <div className="grid gap-2">
              <label
                htmlFor="TransferTaxPercentage"
                className="text-sm font-medium text-start"
              >
                Porcentaje de impuesto de transferencia
              </label>
              <Input
                id="TransferTaxPercentage"
                type="number"
                step="0.01"
                min="0"
                disabled={isLoading}
                placeholder="Ej: 0.15"
                className="w-sm"
                {...register("TransferTaxPercentage")}
              />
              {errors.TransferTaxPercentage && (
                <p className="text-red-500 text-xs">
                  {errors.TransferTaxPercentage.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="LBTRFee"
                className="text-sm font-medium text-start"
              >
                Comision LBTR
              </label>
              <Input
                id="LBTRFee"
                type="number"
                step="0.01"
                min="0"
                disabled={isLoading}
                placeholder="Ej: 150"
                className="w-sm"
                {...register("LBTRFee")}
              />
              {errors.LBTRFee && (
                <p className="text-red-500 text-xs">
                  {errors.LBTRFee.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-start gap-2">
            <Button
              variant="default"
              disabled={!isValid || saveMutation.isPending}
              type="submit"
            >
              {saveMutation.isPending
                ? "Guardando..."
                : "Guardar configuracion"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
