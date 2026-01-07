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
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { createUserWithEmailAndPassword } from "firebase/auth";

const newUserSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  type: z.enum(["ADMIN", "USER"]),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type NewUserValues = z.infer<typeof newUserSchema>;

export function NewUserDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<NewUserValues>({
    resolver: zodResolver(newUserSchema),
    mode: "onChange",
    defaultValues: {
      type: "USER",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: NewUserValues) => {
      // Crear usuario en Auth y luego persistir perfil en Firestore
      const credential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      await setDoc(doc(db, "users", credential.user.uid), {
        name: data.name,
        email: data.email,
        type: data.type,
        avatar: "",
        createdAt: new Date(),
      });
    },
    onSuccess: () => {
      toast.success("Usuario creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset({ type: "USER" });
      setOpen(false);
    },
    onError: (error: FirebaseError) => {
      toast.error(error?.message || "Ocurrió un error inesperado.");
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full" onClick={() => reset({ type: "USER" })}>
          <PlusCircle className="mr-1" />
          Nuevo usuario
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">Nuevo usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-start">Nombre</label>
            <Input
              placeholder="Nombre completo"
              {...register("name")}
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-start">Correo</label>
            <Input
              type="email"
              placeholder="usuario@correo.com"
              {...register("email")}
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-start">Rol</label>
            <Select
              value={watch("type")}
              onValueChange={(val) =>
                setValue("type", val as NewUserValues["type"], {
                  shouldValidate: true,
                })
              }
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="USER">USER</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-red-500 text-xs">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-start">
              Contraseña inicial
            </label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              {...register("password")}
              disabled={isPending}
            />
            {errors.password && (
              <p className="text-red-500 text-xs">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
