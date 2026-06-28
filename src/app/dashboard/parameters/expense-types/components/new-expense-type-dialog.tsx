import React from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createExpenseType } from "@/actions/expense-types";

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
      await createExpenseType(data.name);
    },
    onSuccess: () => {
      toast.success("Tipo de gasto creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["expenseTypes"] });
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
      title="Nuevo tipo de gasto"
      description="Crea una categoría para clasificar tus gastos."
      contentClassName="max-w-sm"
      trigger={
        <Button variant="default" className="w-full" onClick={() => reset()}>
          <PlusCircle className="mr-1" />
          Nuevo tipo de gasto
        </Button>
      }
      onSubmit={onSubmit}
      isSubmitting={isPending}
      canSubmit={isValid}
      submitLabel="Guardar"
    >
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
    </FormDialog>
  );
}
