"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    const markReady = () => {
      if (!isMounted) return;
      setCanReset(true);
      setLoading(false);
    };

    const markInvalid = () => {
      if (!isMounted) return;
      setCanReset(false);
      setLoading(false);
    };

    const initializeRecoverySession = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          markInvalid();
          return;
        }

        markReady();
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          markInvalid();
          return;
        }

        window.history.replaceState(null, "", window.location.pathname);
        markReady();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        markReady();
        return;
      }

      markInvalid();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        markReady();
      }
    });

    void initializeRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    if (!canReset) {
      setError("El enlace de recuperacion es invalido o ha expirado.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(`No se pudo actualizar la contrasena: ${updateError.message}`);
      }

      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrio un error inesperado. Intenta de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Contrasena actualizada</h1>
                  <p className="text-muted-foreground text-balance">
                    Tu contrasena se ha restablecido correctamente. Ya puedes
                    iniciar sesion con tu nueva contrasena.
                  </p>
                </div>
                <Field>
                  <Button onClick={() => router.push("/login")}>
                    Ir al inicio de sesion
                  </Button>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            {loading ? (
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Verificando enlace...</h1>
                  <p className="text-muted-foreground text-balance">
                    Estamos validando tu enlace de recuperacion.
                  </p>
                </div>
              </FieldGroup>
            ) : !canReset ? (
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Enlace invalido</h1>
                  <p className="text-muted-foreground text-balance">
                    El enlace de recuperacion es invalido o ha expirado.
                    Solicita uno nuevo.
                  </p>
                </div>
                <Field>
                  <Button asChild>
                    <Link href="/forgot-password">Solicitar nuevo enlace</Link>
                  </Button>
                </Field>
              </FieldGroup>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Nueva contrasena</h1>
                    <p className="text-muted-foreground text-balance">
                      Ingresa tu nueva contrasena para restablecer el acceso a
                      tu cuenta.
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-md bg-red-100 p-3 text-center text-sm text-red-800">
                      {error}
                    </div>
                  )}
                  <Field>
                    <FieldLabel htmlFor="new-password">
                      Nueva contrasena
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirmar contrasena
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? "Restableciendo..."
                        : "Restablecer contrasena"}
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
