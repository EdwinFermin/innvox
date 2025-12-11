import React from "react";
// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useFieldArray, useWatch } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Timestamp,
  doc,
  setDoc,
  type DocumentReference,
} from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { useClients } from "@/hooks/use-clients";
import { useAuthStore } from "@/store/auth";
import { ClientsCombobox } from "./clients-combobox";
import { generateCF, generateInvoiceNumber, generateNCF } from "@/utils/tools";
import { useConfigs } from "@/hooks/use-configs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Invoice, InvoiceItem } from "@/types/invoice.types";
import { Client } from "@/types/client.types";
import { User } from "@/types/auth.types";

const invoiceItemSchema = z.object({
  itemId: z.string().min(1, "El ID es obligatorio"),
  description: z
    .string()
    .min(1, "La descripción del item es obligatoria")
    .max(500, "Máximo 500 caracteres"),
  weight: z.string().default(""),
  tracking: z.string().default(""),
  unitPrice: z.number().min(0, "El precio debe ser mayor o igual a 0"),
});

const newInvoiceSchema = z.object({
  id: z.string().optional(),
  user: z.string().optional(),
  client: z.string().nonempty("El cliente es obligatorio"),
  createdAt: z.date().optional(),
  invoiceType: z.enum(["FINAL", "RECEIPT", "FISCAL"]),
  NCF: z.string().min(1, "El NCF es obligatorio").optional().or(z.literal("")),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Debes agregar al menos un item a la factura"),
  ITBIS: z.number().min(0, "El ITBIS no puede ser negativo"),
  amount: z.number().min(0, "El monto no puede ser negativo"),
});

type InvoiceItemFormValues = z.input<typeof invoiceItemSchema>;
type NewInvoiceFormValues = z.input<typeof newInvoiceSchema>;
type DialogMode = "create" | "edit";

const createEmptyItem = (): InvoiceItemFormValues => ({
  itemId: "",
  description: "",
  weight: "",
  tracking: "",
  unitPrice: 0,
});

interface NewInvoiceDialogProps {
  onSuccess: (payload: { id: string; mode: DialogMode }) => void;
  invoice?: Invoice | null;
  onEditDone?: () => void;
}

export function NewInvoiceDialog({
  onSuccess,
  invoice,
  onEditDone,
}: NewInvoiceDialogProps) {
  const buildDefaultValues = React.useCallback(
    (): NewInvoiceFormValues => ({
      id: "",
      user: "",
      client: "",
      createdAt: undefined,
      invoiceType: "RECEIPT",
      NCF: "",
      items: [createEmptyItem()],
      ITBIS: 0,
      amount: 0,
    }),
    []
  );
  const defaultValues = React.useMemo<NewInvoiceFormValues>(
    () => buildDefaultValues(),
    [buildDefaultValues]
  );

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: clients } = useClients(user?.id || "");
  const { data: configs } = useConfigs();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
  } = useForm<NewInvoiceFormValues>({
    resolver: zodResolver(newInvoiceSchema),
    mode: "onChange",
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const watchedItems = useWatch({
    control,
    name: "items",
  });
  const itbisPercentage = React.useMemo(() => {
    const rawPercentage = configs?.ITBIS?.percentage;
    const parsed = Number(rawPercentage);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [configs]);
  const itemsTotal = React.useMemo(() => {
    const currentItems = watchedItems ?? [];
    return currentItems.reduce(
      (sum, item) => sum + (Number(item?.unitPrice ?? 0) || 0),
      0
    );
  }, [watchedItems]);
  const itemsErrorMessage = (
    errors.items as { root?: { message?: string } } | undefined
  )?.root?.message;

  React.useEffect(() => {
    setValue("amount", itemsTotal, { shouldValidate: true });
    const computedITBIS = Number(
      (itemsTotal * (itbisPercentage / 100)).toFixed(2)
    );
    setValue("ITBIS", computedITBIS, { shouldValidate: true });
  }, [itemsTotal, itbisPercentage, setValue]);
  // State for the dialog
  const [open, setOpen] = React.useState(false);
  const isEditMode = Boolean(invoice);
  const lastInvoiceIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const currentInvoiceId = invoice?.id ?? null;
    const lastInvoiceId = lastInvoiceIdRef.current;

    if (currentInvoiceId && invoice) {
      if (currentInvoiceId !== lastInvoiceId) {
        reset({
          id: currentInvoiceId,
          client: invoice.clientId,
          invoiceType: invoice.invoiceType,
          ITBIS: invoice.ITBIS,
          amount: invoice.amount,
          NCF: invoice.NCF ?? "",
          items:
            invoice.items && invoice.items.length > 0
              ? invoice.items.map((item) => ({ ...item }))
              : [createEmptyItem()],
        });
        setOpen(true);
        lastInvoiceIdRef.current = currentInvoiceId;
      }
      return;
    }

    if (lastInvoiceId !== null) {
      lastInvoiceIdRef.current = null;
    }

    reset(buildDefaultValues());
  }, [invoice, reset, buildDefaultValues]);

  const handleClose = React.useCallback(() => {
    reset(buildDefaultValues());
    setOpen(false);
    if (invoice) {
      onEditDone?.();
    }
  }, [invoice, onEditDone, reset, buildDefaultValues]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewInvoiceFormValues) => {
      const isEditing = Boolean(invoice);
      const ref = doc(
        db,
        "invoices",
        isEditing && invoice ? invoice.id : generateInvoiceNumber()
      );

      const clientRef = doc(
        db,
        "clients",
        data.client
      ) as DocumentReference<Client>;
      const invoiceUserId = invoice?.userId || user?.id;

      if (!invoiceUserId) {
        throw new Error("No se encontró el usuario autenticado.");
      }

      const userRef = doc(
        db,
        "users",
        invoiceUserId
      ) as DocumentReference<User>;

      const shouldGenerateIdentifiers =
        !isEditing || invoice?.invoiceType !== data.invoiceType;

      const resolvedNCF = shouldGenerateIdentifiers
        ? data.invoiceType === "FISCAL"
          ? await generateNCF()
          : data.invoiceType === "FINAL"
          ? await generateCF()
          : "N/A"
        : invoice?.NCF ?? null;

      const normalizedItems: InvoiceItem[] = data.items.map((item) => ({
        itemId: item.itemId,
        description: item.description,
        weight: item.weight ?? "",
        tracking: item.tracking ?? "",
        unitPrice: Number(item.unitPrice) || 0,
      }));

      const itemsAmount = normalizedItems.reduce(
        (sum, item) => sum + item.unitPrice,
        0
      );

      const payload = {
        id: ref.id,
        invoiceType: data.invoiceType,
        NCF: resolvedNCF,
        client: clientRef,
        clientId: data.client,
        items: normalizedItems,
        amount: itemsAmount,
        ITBIS: data.ITBIS,
        createdAt: invoice?.createdAt ?? Timestamp.fromDate(new Date()),
        user: userRef,
        userId: invoiceUserId,
      };

      await setDoc(ref, payload, { merge: false });

      return {
        id: ref.id,
        mode: (isEditing ? "edit" : "create") as DialogMode,
      };
    },
    onSuccess: ({ id, mode }) => {
      toast.success(
        mode === "edit"
          ? "Factura actualizada exitosamente"
          : "Factura creada exitosamente"
      );
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      handleClose();
      onSuccess({ id, mode });
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full"
          onClick={() => {
            if (invoice) {
              onEditDone?.();
            }
            reset(buildDefaultValues());
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva Factura
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            {isEditMode ? "Editar factura" : "Nueva Factura"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className={`grid gap-6`}>
            <div className="grid gap-2">
              <label
                htmlFor="client"
                className="text-sm font-medium text-start"
              >
                Tipo de Factura <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="invoiceType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className="w-full"
                      disabled={field.value != "RECEIPT" && isEditMode}
                    >
                      <SelectValue placeholder="Seleccione un tipo de factura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIPT">Pre-Cuenta</SelectItem>
                      <SelectItem value="FINAL">
                        Factura para Consumidor Final
                      </SelectItem>
                      <SelectItem value="FISCAL">
                        Factura con Valor Fiscal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="client"
                className="text-sm font-medium text-start"
              >
                Cliente <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="client"
                render={({ field }) => (
                  <ClientsCombobox
                    clients={clients || []}
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="ITBIS" className="text-sm font-medium text-start">
                ITBIS ({itbisPercentage || 0}%)
              </label>
              <Input
                id="ITBIS"
                type="number"
                placeholder="Calculado automáticamente"
                className="w-full"
                readOnly
                tabIndex={-1}
                {...register("ITBIS", {
                  setValueAs: (v) => (v === "" ? 0 : Number(v)),
                })}
              />
              {errors.ITBIS && (
                <p className="text-red-500 text-xs">{errors.ITBIS.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Calculado usando el porcentaje configurado en ajustes.
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-start">
                Total de items
              </label>
              <Input
                value={itemsTotal.toFixed(2)}
                readOnly
                className="w-full"
              />
              {errors.amount && (
                <p className="text-red-500 text-xs">{errors.amount.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Calculado usando los items agregados.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-start">
                  Items <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(createEmptyItem())}
                >
                  Agregar item
                </Button>
              </div>
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border rounded-md p-4 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Item #{index + 1}
                      </p>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-xs font-medium uppercase text-muted-foreground">
                          Guia <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder="RD1234567890"
                          {...register(`items.${index}.itemId` as const)}
                        />
                        {errors.items?.[index]?.itemId && (
                          <p className="text-red-500 text-xs">
                            {errors.items[index]?.itemId?.message}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium uppercase text-muted-foreground">
                          Tracking
                        </label>
                        <Input
                          placeholder="Tracking"
                          {...register(`items.${index}.tracking` as const)}
                        />
                        {errors.items?.[index]?.tracking && (
                          <p className="text-red-500 text-xs">
                            {errors.items[index]?.tracking?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <label className="text-xs font-medium uppercase text-muted-foreground">
                          Peso
                        </label>
                        <Input
                          placeholder="Ej: 2.5kg"
                          {...register(`items.${index}.weight` as const)}
                        />
                        {errors.items?.[index]?.weight && (
                          <p className="text-red-500 text-xs">
                            {errors.items[index]?.weight?.message}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium uppercase text-muted-foreground">
                          Precio unitario{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register(`items.${index}.unitPrice` as const, {
                            setValueAs: (v) => (v === "" ? 0 : Number(v)),
                          })}
                        />
                        {errors.items?.[index]?.unitPrice && (
                          <p className="text-red-500 text-xs">
                            {errors.items[index]?.unitPrice?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">
                        Descripción <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="Describe el item"
                        {...register(`items.${index}.description` as const)}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-red-500 text-xs">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {itemsErrorMessage && (
                <p className="text-red-500 text-xs">{itemsErrorMessage}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending
                ? isEditMode
                  ? "Actualizando..."
                  : "Guardando..."
                : isEditMode
                ? "Guardar cambios"
                : "Imprimir y Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
