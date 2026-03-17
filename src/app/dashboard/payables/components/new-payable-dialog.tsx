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
import { Textarea } from "@/components/ui/textarea";
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
import { createPayable } from "@/actions/payables";
import { toast } from "sonner";
import { useBranches } from "@/hooks/use-branches";
import { useAuthStore } from "@/store/auth";
import { getDateInputValue } from "@/utils/dates";

const newPayableSchema = z.object({
  branch_id: z.string().min(1, "La sucursal es obligatoria"),
  name: z.string().min(1, "El nombre es obligatorio"),
  amount: z.coerce.number().positive("Monto inválido"),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  status: z.string().min(1, "El estado es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type NewPayableValues = z.infer<typeof newPayableSchema>;
type NewPayableFormValues = z.input<typeof newPayableSchema>;

export function NewPayableDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<NewPayableFormValues>({
    resolver: zodResolver(newPayableSchema),
    mode: "onChange",
    defaultValues: {
      branch_id: "",
      status: "pendiente",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewPayableValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      await createPayable({
        ...data,
        amount: Number(data.amount),
        due_date: data.due_date,
      });
    },
    onSuccess: () => {
      toast.success("Cuenta por pagar registrada");
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      reset({ status: "pendiente", branch_id: "" });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewPayableValues));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full"
          onClick={() => reset({ status: "pendiente", branch_id: "" })}
        >
          <PlusCircle className="mr-1" />
          Nueva cuenta por pagar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Nueva cuenta por pagar
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={watch("branch_id")}
                onValueChange={(val) =>
                  setValue("branch_id", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branch_id && (
                <p className="text-xs text-red-500">
                  {errors.branch_id.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Proveedor o referencia"
                {...register("name")}
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount")}
                disabled={isPending}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vencimiento</label>
              <input
                type="date"
                {...register("due_date")}
                value={getDateInputValue(watch("due_date"))}
                disabled={isPending}
                className="w-full border border-input rounded-md pl-1 h-9"
              />
              {errors.due_date && (
                <p className="text-xs text-red-500">{errors.due_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={watch("status")}
                onValueChange={(val) =>
                  setValue("status", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-xs text-red-500">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              rows={3}
              placeholder="Detalle de la cuenta"
              {...register("description")}
              disabled={isPending}
            />
            {errors.description && (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
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
