import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ClientsCombobox } from "@/app/dashboard/invoices/components/clients-combobox";
import { createReceivable } from "@/actions/receivables";
import { useClients } from "@/hooks/use-clients";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
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

const newReceivableSchema = z.object({
  branch_id: z.string().min(1, "La sucursal es obligatoria"),
  client_id: z.string().min(1, "El cliente es obligatorio"),
  amount: z.coerce.number().positive("Monto inválido"),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  status: z.string().min(1, "El estado es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type NewReceivableValues = z.infer<typeof newReceivableSchema>;
type NewReceivableFormValues = z.input<typeof newReceivableSchema>;

export function NewReceivableDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const { data: clients } = useClients(user?.id || "");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
    control,
  } = useForm<NewReceivableFormValues>({
    resolver: zodResolver(newReceivableSchema),
    mode: "onChange",
    defaultValues: {
      branch_id: "",
      status: "pendiente",
      due_date: getTodayDateKey(),
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewReceivableValues) => {
      if (!user?.id) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      const clientName = clients.find((c) => c.id === data.client_id)?.name;

      await createReceivable({
        ...data,
        name: clientName ?? "Cliente",
        amount: Number(data.amount),
        due_date: data.due_date,
      });
    },
    onSuccess: () => {
      toast.success("Cuenta por cobrar registrada");
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      reset({ status: "pendiente", branch_id: branches.length === 1 ? branches[0].id : "", due_date: getTodayDateKey() });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as NewReceivableValues));

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Nueva cuenta por cobrar"
      description="Registra un cobro pendiente y deja claro su vencimiento, estado y referencia operativa para seguimiento."
      contentClassName="max-h-[90vh] max-w-xl overflow-y-auto lg:max-w-2xl"
      trigger={
        <Button
          variant="default"
          className="w-full rounded-2xl sm:w-auto"
          onClick={() => reset({ status: "pendiente", branch_id: branches.length === 1 ? branches[0].id : "", due_date: getTodayDateKey() })}
        >
          <PlusCircle className="mr-1" />
          Nueva cuenta por cobrar
        </Button>
      }
      onSubmit={onSubmit}
      isSubmitting={isPending}
      canSubmit={isValid}
      submitLabel="Guardar cuenta por cobrar"
    >
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
                  <label className="dashboard-field-label">Cliente</label>
                  <Controller
                    control={control}
                    name="client_id"
                    render={({ field }) => (
                      <ClientsCombobox
                        clients={clients || []}
                        value={field.value || ""}
                        onChange={(val) =>
                          setValue("client_id", val, { shouldValidate: true })
                        }
                      />
                    )}
                  />
                  {errors.client_id && <p className="dashboard-field-error">{errors.client_id.message}</p>}
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
                    Usa una referencia clara para facilitar cobranza, acuerdos de pago y seguimiento comercial.
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
    </FormDialog>
  );
}
