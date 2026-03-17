"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { changeOwnPassword } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contrasena actual es obligatoria"),
    newPassword: z.string().min(6, "La nueva contrasena debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contrasena"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La confirmacion no coincide con la nueva contrasena",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contrasena debe ser diferente a la actual",
    path: ["newPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordCard() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: changeOwnPassword,
    onSuccess: () => {
      toast.success("Contrasena actualizada");
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo actualizar la contrasena");
    },
  });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>
          Cambia tu contrasena de acceso. Necesitas tu contrasena actual para confirmar el cambio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit((values) => mutate(values))}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contrasena actual</label>
            <Input
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
              disabled={isPending}
            />
            {errors.currentPassword ? (
              <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nueva contrasena</label>
              <Input
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
                disabled={isPending}
              />
              {errors.newPassword ? (
                <p className="text-xs text-red-500">{errors.newPassword.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar contrasena</label>
              <Input
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                disabled={isPending}
              />
              {errors.confirmPassword ? (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Actualizando..." : "Cambiar contrasena"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
