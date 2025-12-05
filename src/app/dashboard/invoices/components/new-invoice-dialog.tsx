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
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Invoice } from "@/types/invoice.types";
import { Client } from "@/types/client.types";
import { User } from "@/types/auth.types";

const newInvoiceSchema = z.object({
  id: z.string().optional(),
  user: z.string().optional(),
  client: z.string().nonempty("El cliente es obligatorio"),
  createdAt: z.date().optional(),
  invoiceType: z.enum(["FINAL", "RECEIPT", "FISCAL"]),
  NCF: z.string().min(1, "El NCF es obligatorio").optional(),
  description: z
    .string()
    .nonempty("La descripción es obligatoria")
    .min(1, "La descripción es obligatoria"),
  ITBIS: z.number().min(0, "El ITBIS no puede ser negativo"),
  amount: z.number().min(1, "El monto no puede ser negativo ni cero"),
});

type NewInvoiceValues = z.infer<typeof newInvoiceSchema>;
type DialogMode = "create" | "edit";

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
  const defaultValues = React.useMemo<NewInvoiceValues>(
    () => ({
      id: "",
      user: "",
      client: "",
      createdAt: undefined,
      invoiceType: "RECEIPT",
      NCF: "",
      description: "",
      ITBIS: 0,
      amount: 0,
    }),
    []
  );

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: clients } = useClients(user?.id || "");
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<NewInvoiceValues>({
    resolver: zodResolver(newInvoiceSchema),
    mode: "onChange",
    defaultValues,
  });
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
          description: invoice.description,
          ITBIS: invoice.ITBIS,
          amount: invoice.amount,
          NCF: invoice.NCF ?? "",
        });
        setOpen(true);
        lastInvoiceIdRef.current = currentInvoiceId;
      }
      return;
    }

    if (lastInvoiceId !== null) {
      lastInvoiceIdRef.current = null;
    }

    reset(defaultValues);
  }, [invoice, reset, defaultValues]);

  const handleClose = React.useCallback(() => {
    reset(defaultValues);
    setOpen(false);
    if (invoice) {
      onEditDone?.();
    }
  }, [invoice, onEditDone, reset, defaultValues]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewInvoiceValues) => {
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

      const payload = {
        id: ref.id,
        invoiceType: data.invoiceType,
        NCF: resolvedNCF,
        client: clientRef,
        clientId: data.client,
        description: data.description,
        amount: data.amount,
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
            reset();
          }}
        >
          <PlusCircle className="mr-1" />
          Nueva Factura
        </Button>
      </DialogTrigger>

      <DialogContent className={"max-w-sm"}>
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
                    <SelectTrigger className="w-full">
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
              <label htmlFor="name" className="text-sm font-medium text-start">
                Descripción <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="description"
                placeholder="Descripción de la factura"
                className="w-full"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-500 text-xs">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="ITBIS" className="text-sm font-medium text-start">
                ITBIS <span className="text-red-500">*</span>
              </label>
              <Input
                id="ITBIS"
                type="number"
                placeholder="50.00"
                className="w-full"
                {...register("ITBIS", {
                  setValueAs: (v) => (v === "" ? 0 : Number(v)),
                })}
              />
              {errors.ITBIS && (
                <p className="text-red-500 text-xs">{errors.ITBIS.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-start"
              >
                Monto <span className="text-red-500">*</span>
              </label>
              <Input
                id="amount"
                type="number"
                placeholder="250.00"
                className="w-full"
                {...register("amount", {
                  setValueAs: (v) => (v === "" ? 0 : Number(v)),
                })}
              />
              {errors.amount && (
                <p className="text-red-500 text-xs">{errors.amount.message}</p>
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
