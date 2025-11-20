"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import z from "zod";
import { toast } from "sonner";

const settingsSchema = z.object({
  rangeStart: z.string().nonempty("El rango inicial es obligatorio"),
  rangeEnd: z.string().nonempty("El rango final es obligatorio"),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: ncfConfig, isLoading } = useQuery({
    queryKey: ["ncf-config"],
    queryFn: () => getDoc(doc(db, "configs", "NCF")).then((s) => s.data()),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (ncfConfig) {
      reset({
        rangeStart: ncfConfig.rangeStart || "",
        rangeEnd: ncfConfig.rangeEnd || "",
      });
    }
  }, [ncfConfig, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsValues) => {
      await setDoc(
        doc(db, "configs", "NCF"),
        {
          rangeStart: values.rangeStart,
          rangeEnd: values.rangeEnd,
        },
        { merge: true }
      );
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ["ncf-config"] });
    },
  });

  const onSubmit = (values: SettingsValues) => {
    saveMutation.mutate(values);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h3 className="text-2xl font-semibold">Configuraciones Generales</h3>
        <span className="text-muted-foreground text-sm">
          Gestiona toda la configuración de tu cuenta y preferencias del sistema
        </span>
      </div>

      <div className="mx-auto h-full w-full max-w-3xl">
        <Separator className="my-4" />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={`grid gap-6`}>
            <h3 className="text-lg font-semibold">
              Rango de numeros de comprobantes fiscales
            </h3>

            <div className="grid gap-2">
              <label
                htmlFor="rangeStart"
                className="text-sm font-medium text-start"
              >
                Numero inicial
              </label>
              <Input
                id="rangeStart"
                disabled={isLoading}
                placeholder="Ingresa el numero inicial del rango"
                className="w-sm"
                {...register("rangeStart")}
              />
              {errors.rangeStart && (
                <p className="text-red-500 text-xs">
                  {errors.rangeStart.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="rangeEnd"
                className="text-sm font-medium text-start"
              >
                Numero final
              </label>
              <Input
                id="rangeEnd"
                disabled={isLoading}
                placeholder="Ingresa el numero final del rango"
                className="w-sm"
                {...register("rangeEnd")}
              />
              {errors.rangeEnd && (
                <p className="text-red-500 text-xs">
                  {errors.rangeEnd.message}
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
                : "Guardar configuración"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
