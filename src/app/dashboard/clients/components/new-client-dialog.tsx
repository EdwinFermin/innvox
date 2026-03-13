import React from "react";
// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DialogTitle } from "@radix-ui/react-dialog";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/actions/clients";
import { toast } from "sonner";

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
        <Button variant="default" className="w-full">
          <PlusCircle className="mr-1" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>

      <DialogContent className={"max-w-sm"}>
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Nuevo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className={`grid gap-6`}>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-start">
                Nombre
              </label>
              <Input
                id="name"
                placeholder="John Doe"
                className="w-full"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="po_box" className="text-sm font-medium text-start">
                PO Box
              </label>
              <Input
                id="po_box"
                placeholder="EV-123450"
                className="w-full"
                {...register("po_box")}
              />
              {errors.po_box && (
                <p className="text-red-500 text-xs">{errors.po_box.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
