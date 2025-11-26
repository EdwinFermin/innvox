"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import z from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

const settingsSchema = z.object({
  NCFRangeStart: z.string().nonempty("El numero de comprobante fiscal inicial es obligatorio"),
  NCFRangeEnd: z.string().nonempty("El numero de comprobante fiscal final es obligatorio"),
  CFRangeStart: z.string().nonempty("El numero de consumidor final inicial es obligatorio"),
  CFRangeEnd: z.string().nonempty("El numero de consumidor final final es obligatorio"),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && user.type !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const queryClient = useQueryClient();

  type ConfigRange = {
    rangeStart?: string;
    rangeEnd?: string;
  };

  const { data: configs, isLoading } = useQuery({
    queryKey: ["configs"],
    queryFn: async (): Promise<Record<string, ConfigRange>> => {
      const snapshot = await getDocs(collection(db, "configs"));
      const result: Record<string, ConfigRange> = {};

      snapshot.forEach((docSnap) => {
        result[docSnap.id] = docSnap.data() as ConfigRange;
      });

      return result;
    },
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
    if (configs) {
      reset({
        NCFRangeStart: configs.NCF?.rangeStart || "",
        NCFRangeEnd: configs.NCF?.rangeEnd || "",
        CFRangeStart: configs.CF?.rangeStart || "",
        CFRangeEnd: configs.CF?.rangeEnd || "",
      });
    }
  }, [configs, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsValues) => {
      const batch = writeBatch(db);

      batch.set(
        doc(db, "configs", "NCF"),
        {
          rangeStart: values.NCFRangeStart,
          rangeEnd: values.NCFRangeEnd,
        },
        { merge: true }
      );

      batch.set(
        doc(db, "configs", "CF"),
        {
          rangeStart: values.CFRangeStart,
          rangeEnd: values.CFRangeEnd,
        },
        { merge: true }
      );

      await batch.commit();
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ["configs"] });
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
