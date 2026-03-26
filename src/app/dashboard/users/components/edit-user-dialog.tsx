import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { updateUser } from "@/actions/users";
import { User } from "@/types/auth.types";
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

const editUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["ADMIN", "USER", "ACCOUNTANT"]),
  branch_ids: z.array(z.string()).optional(),
});

type EditUserValues = z.infer<typeof editUserSchema>;

export function EditUserDialog({ user }: { user: User }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { data: branches } = useBranches(currentUser?.id || "", currentUser?.branch_ids);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    mode: "onChange",
    defaultValues: {
      name: user.name,
      type: user.type,
      branch_ids: user.branch_ids ?? [],
    },
  });

  React.useEffect(() => {
    reset({
      name: user.name,
      type: user.type,
      branch_ids: user.branch_ids ?? [],
    });
  }, [user, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: EditUserValues) => {
      await updateUser(user.id, {
        name: values.name,
        type: values.type,
        branch_ids: values.branch_ids ?? [],
      });
    },
    onSuccess: () => {
      toast.success("Usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Error al actualizar el usuario");
    },
  });

  const selectedBranches = watch("branch_ids") ?? [];
  const role = watch("type");

  const toggleBranch = (id: string) => {
    const current = new Set(selectedBranches);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setValue("branch_ids", Array.from(current), { shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent"
        >
          Editar
        </button>
      </DialogTrigger>
      <DialogContent className="dashboard-dialog-content max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Editar usuario
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            Ajusta nombre, rol y sucursales disponibles sin cambiar el correo de acceso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="dashboard-form-card grid gap-4 md:grid-cols-2">
              <div className="dashboard-field">
                <label htmlFor="edit-user-name" className="dashboard-field-label">
                  Nombre
                </label>
                <Input
                  id="edit-user-name"
                  placeholder="Nombre completo…"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("name")}
                  disabled={isPending}
                />
                {errors.name && <p className="dashboard-field-error">{errors.name.message}</p>}
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Correo</label>
                <Input value={user.email} disabled className="h-11 rounded-2xl border-border/70 bg-muted/30" />
                <p className="dashboard-field-hint">El correo no se puede modificar desde aquí.</p>
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Rol</label>
                <Select
                  value={role}
                  onValueChange={(val) =>
                    setValue("type", val as EditUserValues["type"], {
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
                      onCheckedChange={() => toggleBranch(branch.id)}
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
              {isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
