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
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { useClients } from "@/hooks/use-clients";
import { useAuthStore } from "@/store/auth";
import { ClientsCombobox } from "./clients-combobox";
import { generateCF, generateInvoiceNumber, generateNCF } from "@/utils/tools";
import { CustomSwitch } from "@/components/ui/custom-switch";

const newInvoiceSchema = z.object({
  id: z.string().optional(),
  user: z.string().optional(),
  client: z.string().nonempty("El cliente es obligatorio"),
  createdAt: z.date().optional(),
  isFiscalReceipt: z.boolean(),
  NCF: z.string().min(1, "El NCF es obligatorio").optional(),
  description: z
    .string()
    .nonempty("La descripción es obligatoria")
    .min(1, "La descripción es obligatoria"),
  ITBIS: z.number().min(0, "El ITBIS no puede ser negativo"),
  amount: z.number().min(1, "El monto no puede ser negativo ni cero"),
});

type NewInvoiceValues = z.infer<typeof newInvoiceSchema>;

export function NewInvoiceDialog() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuthStore();

  const { data: clients } = useClients(user?.id || "");

  const queryClient = useQueryClient();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<NewInvoiceValues>({
    resolver: zodResolver(newInvoiceSchema),
    mode: "onChange",
    defaultValues: {
      isFiscalReceipt: false,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewInvoiceValues) => {
      const ref = doc(db, "invoices", generateInvoiceNumber());

      await setDoc(
        ref,
        {
          ...data,
          id: ref.id,
          NCF: data.isFiscalReceipt ? await generateNCF() : await generateCF(),
          client: doc(db, "clients", data.client),
          user: doc(db, "users", user?.id || ""),
          createdAt: new Date(),
        },
        { merge: false }
      );
    },
    onSuccess: () => {
      toast.success("Factura creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      reset();
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" className="w-full">
          <PlusCircle className="mr-1" />
          Nueva Factura
        </Button>
      </DialogTrigger>

      <DialogContent className={"max-w-sm"}>
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Nueva Factura
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className={`grid gap-6`}>

            <CustomSwitch
              control={control}
              name="isFiscalReceipt"
              label="Incluir Valor Fiscal"
            />
            
            <div className="grid gap-2">
              <label
                htmlFor="client"
                className="text-sm font-medium text-start"
              >
                Cliente
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
                Descripción
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
                ITBIS
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
                Monto
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
              {isPending ? "Guardando..." : "Imprimir y Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
