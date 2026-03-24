"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createOperatingCost,
  updateOperatingCost,
} from "@/actions/operating-costs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useExpenseTypes } from "@/hooks/use-expense-types";
import { useAuthStore } from "@/store/auth";
import { OperatingCost } from "@/types/operating-cost.types";

const frequencyOptions = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "custom", label: "Personalizado" },
] as const;

const optionalPositiveInt = z
  .union([z.literal(""), z.coerce.number()])
  .transform((v) => (v === "" ? null : v))
  .pipe(z.number().int().positive().nullable());

const schema = z.object({
  branchId: z.string().min(1, "La sucursal es obligatoria"),
  name: z.string().min(1, "El nombre es obligatorio"),
  expenseTypeId: z.string().min(1, "El tipo de gasto es obligatorio"),
  defaultAmount: z.coerce.number().positive("Monto inválido"),
  currency: z.enum(["DOP", "USD"]),
  frequency: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  dayOfMonth: optionalPositiveInt,
  customIntervalDays: optionalPositiveInt,
  allowsCustomAmount: z.boolean(),
  description: z.string().optional().nullable(),
});

type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface Props {
  editData?: OperatingCost;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewOperatingCostDialog({ editData, trigger, onSuccess, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );
  const { data: expenseTypes } = useExpenseTypes(user?.id || "");

  const isEdit = !!editData;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      currency: "DOP",
      frequency: "monthly",
      allowsCustomAmount: false,
      dayOfMonth: "",
      customIntervalDays: "",
    },
  });

  const frequency = watch("frequency");

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormOutput) => {
      if (isEdit) {
        await updateOperatingCost(editData.id, {
          branchId: data.branchId,
          name: data.name,
          expenseTypeId: data.expenseTypeId,
          defaultAmount: data.defaultAmount,
          currency: data.currency,
          frequency: data.frequency,
          dayOfMonth: data.frequency === "monthly" ? data.dayOfMonth : null,
          customIntervalDays: data.frequency === "custom" ? data.customIntervalDays : null,
          allowsCustomAmount: data.allowsCustomAmount,
          description: data.description || null,
        });
      } else {
        await createOperatingCost({
          branchId: data.branchId,
          name: data.name,
          expenseTypeId: data.expenseTypeId,
          defaultAmount: data.defaultAmount,
          currency: data.currency,
          frequency: data.frequency,
          dayOfMonth: data.frequency === "monthly" ? data.dayOfMonth : null,
          customIntervalDays: data.frequency === "custom" ? data.customIntervalDays : null,
          allowsCustomAmount: data.allowsCustomAmount,
          description: data.description || null,
        });
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Costo operativo actualizado" : "Costo operativo creado");
      queryClient.invalidateQueries({ queryKey: ["operatingCosts"] });
      reset();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values as FormOutput));

  React.useEffect(() => {
    if (!open) return;

    if (isEdit && editData) {
      reset({
        branchId: editData.branch_id,
        name: editData.name,
        expenseTypeId: editData.expense_type_id,
        defaultAmount: editData.default_amount,
        currency: editData.currency,
        frequency: editData.frequency,
        dayOfMonth: editData.day_of_month ?? "",
        customIntervalDays: editData.custom_interval_days ?? "",
        allowsCustomAmount: editData.allows_custom_amount,
        description: editData.description,
      });
    } else {
      reset({
        currency: "DOP",
        frequency: "monthly",
        allowsCustomAmount: false,
        dayOfMonth: "",
        customIntervalDays: "",
      });
    }
  }, [editData, isEdit, open, reset]);

  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="default" className="w-full rounded-2xl sm:w-auto">
              <PlusCircle className="mr-1" />
              Nuevo costo operativo
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="dashboard-dialog-content max-w-xl overflow-hidden lg:max-w-2xl">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            {isEdit ? "Editar costo operativo" : "Nuevo costo operativo"}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            {isEdit
              ? "Modifica los detalles del costo operativo recurrente."
              : "Define un costo operativo recurrente asociado a una sucursal. Se generarán alertas automáticas según la frecuencia."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="dashboard-dialog-body">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="dashboard-form-card grid gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Sucursal</label>
                  <Select
                    value={watch("branchId")}
                    onValueChange={(val) => setValue("branchId", val, { shouldValidate: true })}
                    disabled={isPending}
                  >
                    <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background px-4 py-3 text-base">
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
                  {errors.branchId && <p className="dashboard-field-error">{errors.branchId.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Nombre</label>
                  <Input
                    placeholder="Ej: Alquiler, Electricidad"
                    className="h-11 rounded-2xl border-border/70 bg-background"
                    {...register("name")}
                    disabled={isPending}
                  />
                  {errors.name && <p className="dashboard-field-error">{errors.name.message}</p>}
                </div>

                <div className="dashboard-field">
                  <label className="dashboard-field-label">Tipo de gasto</label>
                  <Select
                    value={watch("expenseTypeId")}
                    onValueChange={(val) => setValue("expenseTypeId", val, { shouldValidate: true })}
                    disabled={isPending}
                  >
                    <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background px-4 py-3 text-base">
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
                  {errors.expenseTypeId && <p className="dashboard-field-error">{errors.expenseTypeId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="dashboard-field">
                    <label className="dashboard-field-label">Monto</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="h-11 rounded-2xl border-border/70 bg-background"
                      {...register("defaultAmount")}
                      disabled={isPending}
                    />
                    {errors.defaultAmount && <p className="dashboard-field-error">{errors.defaultAmount.message}</p>}
                  </div>
                  <div className="dashboard-field">
                    <label className="dashboard-field-label">Moneda</label>
                    <Select
                      value={watch("currency")}
                      onValueChange={(val) => setValue("currency", val as "DOP" | "USD", { shouldValidate: true })}
                      disabled={isPending}
                    >
                      <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background px-4 py-3 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOP">DOP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="dashboard-form-card flex h-full flex-col gap-4">
                <div className="dashboard-field">
                  <label className="dashboard-field-label">Frecuencia</label>
                  <Select
                    value={watch("frequency")}
                    onValueChange={(val) => setValue("frequency", val as FormValues["frequency"], { shouldValidate: true })}
                    disabled={isPending}
                  >
                    <SelectTrigger className="min-h-12 w-full rounded-2xl border-border/70 bg-background px-4 py-3 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {frequency === "monthly" && (
                  <div className="dashboard-field">
                    <label className="dashboard-field-label">Día del mes</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ej: 15"
                      className="h-11 rounded-2xl border-border/70 bg-background"
                      {...register("dayOfMonth")}
                      disabled={isPending}
                    />
                    <p className="dashboard-field-hint">
                      Día del mes en que se debe realizar el pago (1-31).
                    </p>
                  </div>
                )}

                {frequency === "custom" && (
                  <div className="dashboard-field">
                    <label className="dashboard-field-label">Intervalo en días</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ej: 45"
                      className="h-11 rounded-2xl border-border/70 bg-background"
                      {...register("customIntervalDays")}
                      disabled={isPending}
                    />
                    <p className="dashboard-field-hint">
                      Número de días entre cada pago.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl border p-3">
                  <Checkbox
                    id="allowsCustomAmount"
                    checked={watch("allowsCustomAmount")}
                    onCheckedChange={(checked) =>
                      setValue("allowsCustomAmount", checked === true, { shouldValidate: true })
                    }
                    disabled={isPending}
                  />
                  <label htmlFor="allowsCustomAmount" className="text-sm cursor-pointer">
                    Permitir monto personalizado al completar
                  </label>
                </div>

                <div className="dashboard-field mt-auto">
                  <label className="dashboard-field-label">Descripción</label>
                  <Textarea
                    rows={3}
                    placeholder="Nota opcional…"
                    className="rounded-2xl border-border/70 bg-background"
                    {...register("description")}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="dashboard-dialog-footer">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="rounded-2xl" disabled={!isValid || isPending}>
              {isPending ? "Guardando…" : isEdit ? "Actualizar" : "Crear costo operativo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
