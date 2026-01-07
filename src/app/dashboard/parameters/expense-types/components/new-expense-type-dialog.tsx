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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

const newExpenseTypeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
});

type NewExpenseTypeValues = z.infer<typeof newExpenseTypeSchema>;

export function NewExpenseTypeDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<NewExpenseTypeValues>({
    resolver: zodResolver(newExpenseTypeSchema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewExpenseTypeValues) => {
      const ref = collection(db, "expenseTypes");
      await addDoc(ref, { ...data, createdAt: new Date() });
    },
    onSuccess: () => {
      toast.success("Tipo de gasto creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["expenseTypes"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full" onClick={() => reset()}>
          <PlusCircle className="mr-1" />
          Nuevo tipo de gasto
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Nuevo tipo de gasto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-start">
                Nombre
              </label>
              <Input
                id="name"
                placeholder="Ej. Nomina"
                className="w-full"
                {...register("name")}
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
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
