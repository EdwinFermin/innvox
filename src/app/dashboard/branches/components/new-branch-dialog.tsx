import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createBranch } from "@/actions/branches";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";

const newBranchSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio"),
});

type NewBranchValues = z.infer<typeof newBranchSchema>;

export function NewBranchDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<NewBranchValues>({
    resolver: zodResolver(newBranchSchema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewBranchValues) => {
      await createBranch(data);
    },
    onSuccess: () => {
      toast.success("Sucursal creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Nueva sucursal"
      description="Define una nueva sede operativa con nombre y código para organizar ventas, usuarios y movimientos."
      contentClassName="max-h-[90vh] max-w-lg overflow-y-auto"
      trigger={
        <Button
          variant="default"
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva sucursal
        </Button>
      }
      onSubmit={onSubmit}
      isSubmitting={isPending}
      canSubmit={isValid}
      submitLabel="Crear sucursal"
      submittingLabel="Creando…"
    >
            <div className="dashboard-form-card grid gap-4">
              <div className="dashboard-field">
                <label htmlFor="branch-name" className="dashboard-field-label">
                  Nombre
                </label>
                <Input
                  id="branch-name"
                  placeholder="Nombre de la sucursal…"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("name")}
                  disabled={isPending}
                />
                {errors.name && <p className="dashboard-field-error">{errors.name.message}</p>}
              </div>

              <div className="dashboard-field">
                <label htmlFor="branch-code" className="dashboard-field-label">
                  Código
                </label>
                <Input
                  id="branch-code"
                  placeholder="Ej. SDQ-01…"
                  className="h-11 rounded-2xl border-border/70 bg-background font-mono"
                  {...register("code")}
                  disabled={isPending}
                />
                {errors.code && <p className="dashboard-field-error">{errors.code.message}</p>}
              </div>
            </div>
    </FormDialog>
  );
}
