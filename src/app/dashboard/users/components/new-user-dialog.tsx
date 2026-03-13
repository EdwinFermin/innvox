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
import { createUser } from "@/actions/users";
import { toast } from "sonner";
import { useBranches } from "@/hooks/use-branches";
import { useAuthStore } from "@/store/auth";
import { Checkbox } from "@/components/ui/checkbox";

const newUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  type: z.enum(["ADMIN", "USER"]),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  branch_ids: z.array(z.string()).optional(),
});

type NewUserValues = z.infer<typeof newUserSchema>;

export function NewUserDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { data: branches } = useBranches(
    currentUser?.id || "",
    currentUser?.type === "USER" ? currentUser?.branch_ids : undefined,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<NewUserValues>({
    resolver: zodResolver(newUserSchema),
    mode: "onChange",
    defaultValues: {
      type: "USER",
      branch_ids: [],
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewUserValues) => {
      await createUser(data);
    },
    onSuccess: () => {
      toast.success("Usuario creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset({ type: "USER", branch_ids: [] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full" onClick={() => reset({ type: "USER" })}>
          <PlusCircle className="mr-1" />
          Nuevo usuario
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Nuevo usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-start">Nombre</label>
            <Input
              placeholder="Nombre completo"
              {...register("name")}
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-start">Correo</label>
            <Input
              type="email"
              placeholder="usuario@correo.com"
              {...register("email")}
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-start">Rol</label>
            <Select
              value={watch("type")}
              onValueChange={(val) =>
                setValue("type", val as NewUserValues["type"], {
                  shouldValidate: true,
                })
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-red-500 text-xs">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-start">
              Sucursales permitidas
            </label>
            <div className="grid gap-2 max-h-48 overflow-auto rounded-md border p-3">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={(watch("branch_ids") ?? []).includes(branch.id)}
                    onCheckedChange={() => {
                      const current = new Set(watch("branch_ids") ?? []);
                      if (current.has(branch.id)) {
                        current.delete(branch.id);
                      } else {
                        current.add(branch.id);
                      }
                      setValue("branch_ids", Array.from(current), {
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
              {!branches.length && (
                <span className="text-xs text-muted-foreground">
                  No hay sucursales disponibles.
                </span>
              )}
            </div>
            {errors.branch_ids && (
              <p className="text-red-500 text-xs">
                {errors.branch_ids.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-start">
              Contraseña inicial
            </label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              {...register("password")}
              disabled={isPending}
            />
            {errors.password && (
              <p className="text-red-500 text-xs">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
