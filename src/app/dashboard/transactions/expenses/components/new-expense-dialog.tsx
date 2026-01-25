"use client";

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
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import { useExpenseTypes } from "@/hooks/use-expense-types";

const newExpenseSchema = z.object({
  branchId: z.string().min(1, "La sucursal es obligatoria"),
  expenseTypeId: z.string().min(1, "El tipo de gasto es obligatorio"),
  date: z.string().min(1, "La fecha es obligatoria"),
  amount: z.coerce.number().positive("Monto inválido"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type NewExpenseValues = z.infer<typeof newExpenseSchema>;
type NewExpenseFormValues = z.input<typeof newExpenseSchema>;

export function NewExpenseDialog({ openOnMount }: { openOnMount?: boolean } = {}) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(user?.id || "", user?.branchIds);
  const { data: expenseTypes } = useExpenseTypes(user?.id || "");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<NewExpenseFormValues>({
    resolver: zodResolver(newExpenseSchema),
    mode: "onChange",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewExpenseValues) => {
      const [year, month, day] = data.date.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const ref = collection(db, "expenses");
      await addDoc(ref, {
        ...data,
        amount: Number(data.amount),
        // Store as UTC midnight to keep a consistent calendar date
        date: utcDate,
        createdAt: new Date(),
      });
    },
    onSuccess: () => {
      toast.success("Gasto registrado");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewExpenseValues));

  React.useEffect(() => {
    if (openOnMount) {
      reset();
      setOpen(true);
    }
  }, [openOnMount, reset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full" onClick={() => reset()}>
          <PlusCircle className="mr-1" />
          Nuevo gasto
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Nuevo gasto</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={watch("branchId")}
                onValueChange={(val) =>
                  setValue("branchId", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
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
              {errors.branchId && (
                <p className="text-xs text-red-500">
                  {errors.branchId.message}
                </p>
              )}
            </div>

            <div className="space-y-2 min-w-0">
              <label className="text-sm font-medium">Tipo de gasto</label>
              <Select
                value={watch("expenseTypeId")}
                onValueChange={(val) =>
                  setValue("expenseTypeId", val, { shouldValidate: true })
                }
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.expenseTypeId && (
                <p className="text-xs text-red-500">
                  {errors.expenseTypeId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 mr-6 md:mr-0">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                {...register("date")}
                disabled={isPending}
                className="w-full max-w-full min-w-0 text-sm"
              />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2 min-w-0">
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              rows={3}
              placeholder="Detalle del gasto"
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
