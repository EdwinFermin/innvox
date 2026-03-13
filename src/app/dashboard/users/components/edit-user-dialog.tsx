import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser } from "@/actions/users";
import { toast } from "sonner";
import { useBranches } from "@/hooks/use-branches";
import { useAuthStore } from "@/store/auth";
import { User } from "@/types/auth.types";

const editUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["ADMIN", "USER"]),
  branch_ids: z.array(z.string()).optional(),
});

type EditUserValues = z.infer<typeof editUserSchema>;

export function EditUserDialog({ user }: { user: User }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { data: branches } = useBranches(
    currentUser?.id || "",
    currentUser?.branch_ids
  );

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
        <Button variant="ghost" className="w-full justify-start">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input
              placeholder="Nombre completo"
              {...register("name")}
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Correo</label>
            <Input value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              El correo no se puede modificar desde aquí.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rol</label>
            <Select
              value={watch("type")}
              onValueChange={(val) =>
                setValue("type", val as EditUserValues["type"], {
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
              <p className="text-xs text-red-500">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">
              Sucursales permitidas
            </label>
            <div className="grid gap-2 max-h-56 overflow-auto rounded-md border p-3">
              {branches.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={selectedBranches.includes(branch.id)}
                    onCheckedChange={() => toggleBranch(branch.id)}
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
              <p className="text-xs text-red-500">
                {errors.branch_ids.message as string}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
