import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createClient } from "@/actions/clients";
import { Button } from "@/components/ui/button";
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

const newClientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  po_box: z.string().min(1, "El PO Box es obligatorio"),
});

type NewClientValues = z.infer<typeof newClientSchema>;

export function NewClientDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<NewClientValues>({
    resolver: zodResolver(newClientSchema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewClientValues) => {
      await createClient(data);
    },
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      reset();
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
        <Button variant="default" className="w-full rounded-2xl sm:w-auto">
          <PlusCircle className="mr-1" />
          Nuevo cliente
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Nuevo cliente
          </DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            Crea un registro comercial con su nombre y referencia interna para facturación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="dashboard-form-card grid gap-4">
              <div className="dashboard-field">
                <label htmlFor="name" className="dashboard-field-label">
                  Nombre
                </label>
                <Input
                  id="name"
                  placeholder="Nombre del cliente…"
                  className="h-11 rounded-2xl border-border/70 bg-background"
                  {...register("name")}
                />
                {errors.name && <p className="dashboard-field-error">{errors.name.message}</p>}
              </div>

              <div className="dashboard-field">
                <label htmlFor="po_box" className="dashboard-field-label">
                  PO Box
                </label>
                <Input
                  id="po_box"
                  placeholder="Ej. EV-123450…"
                  className="h-11 rounded-2xl border-border/70 bg-background font-mono"
                  {...register("po_box")}
                />
                {errors.po_box && (
                  <p className="dashboard-field-error">{errors.po_box.message}</p>
                )}
              </div>
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
              {isPending ? "Guardando…" : "Guardar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
