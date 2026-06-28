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
import { createIncomeType } from "@/actions/income-types";

const newIncomeTypeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
});

type NewIncomeTypeValues = z.infer<typeof newIncomeTypeSchema>;

export function NewIncomeTypeDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<NewIncomeTypeValues>({
    resolver: zodResolver(newIncomeTypeSchema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewIncomeTypeValues) => {
      await createIncomeType(data.name);
    },
    onSuccess: () => {
      toast.success("Tipo de ingreso creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["incomeTypes"] });
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
      title="Nuevo tipo de ingreso"
      description="Crea una categoría para clasificar tus ingresos."
      contentClassName="max-w-sm"
      trigger={
        <Button variant="default" className="w-full" onClick={() => reset()}>
          <PlusCircle className="mr-1" />
          Nuevo tipo de ingreso
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
                placeholder="Ej. Venta de servicios"
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
