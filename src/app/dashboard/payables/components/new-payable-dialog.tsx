import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createPayable } from "@/actions/payables";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/hooks/use-branches";
import { useAuthStore } from "@/store/auth";
import { getDateInputValue, getTodayDateKey } from "@/utils/dates";

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
      due_date: getTodayDateKey(),
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
      reset({ status: "pendiente", branch_id: branches.length === 1 ? branches[0].id : "", due_date: getTodayDateKey() });
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
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => reset({ status: "pendiente", branch_id: branches.length === 1 ? branches[0].id : "", due_date: getTodayDateKey() })}
        >
          <PlusCircle className="mr-1" />
          Nueva cuenta por pagar
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            Nueva cuenta por pagar
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            Registra una obligación pendiente y deja trazado su vencimiento, estado y referencia operativa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="dashboard-form-card grid gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Sucursal</label>
                  <Select
                    value={watch("branch_id")}
                    onValueChange={(val) => setValue("branch_id", val, { shouldValidate: true })}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
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
                  {errors.branch_id && <p className="dashboard-field-error">{errors.branch_id.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Nombre</label>
                  <Input
                    placeholder="Proveedor o referencia…"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("name")}
                    disabled={isPending}
                  />
                  {errors.name && <p className="dashboard-field-error">{errors.name.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Monto</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("amount")}
                    disabled={isPending}
                  />
                  {errors.amount && <p className="dashboard-field-error">{errors.amount.message}</p>}
                </div>
              </div>

              <div className="dashboard-form-card grid gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Vencimiento</label>
                  <input
                    type="date"
                    {...register("due_date")}
                    value={getDateInputValue(watch("due_date"))}
                    disabled={isPending}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                  />
                  {errors.due_date && <p className="dashboard-field-error">{errors.due_date.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Estado</label>
                  <Select
                    value={watch("status")}
                    onValueChange={(val) => setValue("status", val, { shouldValidate: true })}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="dashboard-field-error">{errors.status.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Contexto</label>
                  <p className="dashboard-field-hint rounded-[1rem] border border-border/60 bg-background/80 p-4 leading-6">
                    Usa una referencia clara para facilitar conciliación, pagos parciales y seguimiento del proveedor.
                  </p>
                </div>
              </div>
            </div>

            <div className="dashboard-form-card dashboard-field">
              <label className="dashboard-field-label">Descripción</label>
              <Textarea
                rows={4}
                placeholder="Detalle de la cuenta…"
                className="rounded-2xl border-border/70 bg-background"
                {...register("description")}
                disabled={isPending}
              />
              {errors.description && (
                <p className="dashboard-field-error">{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="dashboard-dialog-footer">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl" disabled={!isValid || isPending}>
              {isPending ? "Guardando…" : "Guardar cuenta por pagar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
