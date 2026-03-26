import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
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
import { useAuthStore } from "@/store/auth";

const newUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  type: z.enum(["ADMIN", "USER", "ACCOUNTANT"]),
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

  const selectedBranches = watch("branch_ids") ?? [];
  const role = watch("type");
  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => reset({ type: "USER", branch_ids: [] })}
        >
          <PlusCircle className="mr-1" />
          Nuevo usuario
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-w-2xl overflow-hidden">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Nuevo usuario
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            Crea un acceso nuevo, asigna su rol operativo y limita las sucursales disponibles según el alcance del usuario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="dashboard-form-card grid gap-4 md:grid-cols-2">
              <div className="dashboard-field">
                <label htmlFor="new-user-name" className="dashboard-field-label">
                  Nombre
                </label>
                <Input
                  id="new-user-name"
                  placeholder="Nombre completo…"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("name")}
                  disabled={isPending}
                />
                {errors.name && <p className="dashboard-field-error">{errors.name.message}</p>}
              </div>

              <div className="dashboard-field">
                <label htmlFor="new-user-email" className="dashboard-field-label">
                  Correo
                </label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="usuario@correo.com…"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("email")}
                  disabled={isPending}
                />
                {errors.email && <p className="dashboard-field-error">{errors.email.message}</p>}
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Rol</label>
                <Select
                  value={role}
                  onValueChange={(val) =>
                    setValue("type", val as NewUserValues["type"], {
                      shouldValidate: true,
                    })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ACCOUNTANT">ACCOUNTANT</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="dashboard-field-error">{errors.type.message}</p>}
              </div>

              <div className="dashboard-field">
                <label htmlFor="new-user-password" className="dashboard-field-label">
                  Contraseña inicial
                </label>
                <Input
                  id="new-user-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres…"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("password")}
                  disabled={isPending}
                />
                {errors.password && (
                  <p className="dashboard-field-error">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="dashboard-form-card space-y-3">
              <div className="dashboard-field-label">Sucursales permitidas</div>
              <div className="flex max-h-48 flex-wrap gap-2 overflow-auto rounded-[1rem] border border-border/70 bg-background/85 p-3">
                {branches.map((branch) => (
                  <label
                    key={branch.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={() => {
                        const current = new Set(selectedBranches);
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
                    <span>{branch.name} ({branch.code})</span>
                  </label>
                ))}
                {!branches.length && (
                  <span className="dashboard-field-hint">No hay sucursales disponibles.</span>
                )}
              </div>
              {errors.branch_ids && (
                <p className="dashboard-field-error">{errors.branch_ids.message as string}</p>
              )}
            </div>
          </div>

          <DialogFooter className="dashboard-dialog-footer">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl" disabled={!isValid || isPending}>
              {isPending ? "Guardando…" : "Guardar usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
