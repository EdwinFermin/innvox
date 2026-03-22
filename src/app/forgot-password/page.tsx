"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendPasswordResetEmail } from "@/actions/account";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(email);
      setSent(true);
    } catch {
      setError("Ocurrio un error inesperado. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            {sent ? (
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Revisa tu correo</h1>
                  <p className="text-muted-foreground text-balance">
                    Si existe una cuenta con <strong>{email}</strong>, recibiras
                    un enlace para restablecer tu contrasena.
                  </p>
                </div>
                <Field>
                  <Button asChild>
                    <Link href="/login">Volver al inicio de sesion</Link>
                  </Button>
                </Field>
              </FieldGroup>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">
                      Recuperar contrasena
                    </h1>
                    <p className="text-muted-foreground text-balance">
                      Ingresa tu correo y te enviaremos un enlace para
                      restablecer tu contrasena.
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-md bg-red-100 p-3 text-center text-sm text-red-800">
                      {error}
                    </div>
                  )}
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Enviando..." : "Enviar enlace"}
                    </Button>
                  </Field>
                  <Field>
                    <Button variant="ghost" asChild className="w-full">
                      <Link href="/login">
                        <ArrowLeft className="mr-1 size-4" />
                        Volver al inicio de sesion
                      </Link>
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
        <FieldDescription className="mt-6 px-6 text-center">
          Al hacer clic en continuar, aceptas nuestros{" "}
          <a href="#">Terminos de Servicio</a> y{" "}
          <a href="#">Politica de Privacidad</a>.
        </FieldDescription>
      </div>
    </div>
  );
}
