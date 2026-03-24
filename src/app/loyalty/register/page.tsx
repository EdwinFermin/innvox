"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, UserPlus } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { registerLoyaltyClient } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { buildClientQrUrl } from "@/lib/loyalty";
import { WalletButtons } from "./components/wallet-buttons";

export default function LoyaltyRegisterPage() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [poBox, setPoBox] = React.useState("");
  const [registeredClientId, setRegisteredClientId] = React.useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      return registerLoyaltyClient({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        po_box: poBox.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      setRegisteredClientId(result.clientId);
      toast.success(
        result.isNew
          ? "Registro exitoso!"
          : "Informacion actualizada!",
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al registrarse",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    registerMutation.mutate();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7f2] text-slate-900">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(230,168,21,0.2),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(0,44,90,0.16),_transparent_26%),linear-gradient(180deg,#f9fbf7_0%,#eef4ea_52%,#f8faf7_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(90deg,#002c5a_0%,#0f6b46_58%,#3f8b52_100%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[0.7rem] border border-white/20 bg-white/95 shadow-[0_24px_80px_rgba(0,44,90,0.16)] backdrop-blur">
          <div className="flex flex-col gap-6 bg-[linear-gradient(135deg,#002c5a_0%,#0b5a47_55%,#1b7e56_100%)] px-6 py-6 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="rounded-[0.65rem] bg-white px-4 py-3 shadow-lg shadow-slate-950/15">
                <Image
                  src="/brand/enviosrd-logo.png"
                  alt="EnviosRD Courier"
                  width={180}
                  height={54}
                  priority
                  className="h-auto w-[150px] sm:w-[180px]"
                />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Programa de Fidelidad
                </h1>
                <p className="mt-2 max-w-xl text-sm text-white/82 sm:text-base">
                  Registrate y acumula tokens con cada visita. Al completar 8 tokens recibes tu recompensa.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-6">
          <div className="relative">
            <div className="absolute inset-x-6 top-4 -z-10 h-full rounded-[0.8rem] bg-[#e6a815]/20 blur-3xl" />
            <div className="w-full max-w-xl overflow-hidden rounded-[0.7rem] border border-[#d7dfd1] bg-white/95 shadow-[0_30px_90px_rgba(0,44,90,0.16)]">
              <div className="border-b border-[#e8ede6] bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] px-6 py-5 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9c6f04]">
                  {registeredClientId ? "Registro completo" : "Registro"}
                </p>
                <p className="mt-2 text-sm text-[#647570]">
                  {registeredClientId
                    ? "Guarda tu codigo QR para presentarlo en cada visita."
                    : "Completa tus datos para unirte al programa de fidelidad."}
                </p>
              </div>

              <div className="px-6 py-8 sm:px-8">
                {registeredClientId ? (
                  <div className="space-y-6 text-center">
                    <div className="rounded-full bg-[#eef7ef] p-4 text-[#0f6b46] inline-flex">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>

                    <div>
                      <p className="text-xl font-semibold text-[#0d2d4f]">
                        Bienvenido, {name}!
                      </p>
                      <p className="mt-1 text-sm text-[#647570]">
                        Tu codigo de cliente es: <span className="font-semibold">{registeredClientId}</span>
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="rounded-xl border border-[#dfe7dc] bg-white p-3">
                        <Image
                          src={buildClientQrUrl(registeredClientId)}
                          alt="QR de tu tarjeta"
                          width={220}
                          height={220}
                          unoptimized
                          className="rounded-lg"
                        />
                      </div>
                    </div>

                    <WalletButtons clientId={registeredClientId} />

                    <div className="rounded-[0.6rem] border border-[#dce6db] bg-[#f8fbf7] p-4 text-left text-sm leading-6 text-[#556a63]">
                      Guarda una captura de pantalla de este QR o agregalo a tu billetera digital. Presentalo en cada visita para acumular tokens.
                    </div>

                    <Button
                      className="h-12 w-full rounded-[0.55rem] bg-[#0f6b46] text-base font-semibold text-white shadow-lg shadow-[#0f6b46]/30 transition hover:bg-[#0c593b]"
                      onClick={() => {
                        setRegisteredClientId(null);
                        setName("");
                        setPhone("");
                        setEmail("");
                        setPoBox("");
                      }}
                    >
                      Registrar otro cliente
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0d2d4f]">
                        Nombre completo *
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        required
                        className="h-12 rounded-xl border-[#d7dfd1] bg-white text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0d2d4f]">
                        Telefono *
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="809-000-0000"
                        type="tel"
                        required
                        className="h-12 rounded-xl border-[#d7dfd1] bg-white text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0d2d4f]">
                        Email (opcional)
                      </label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        type="email"
                        className="h-12 rounded-xl border-[#d7dfd1] bg-white text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0d2d4f]">
                        Casillero (opcional)
                      </label>
                      <Input
                        value={poBox}
                        onChange={(e) => setPoBox(e.target.value)}
                        placeholder="EV-123450"
                        className="h-12 rounded-xl border-[#d7dfd1] bg-white text-base"
                      />
                      <p className="text-xs text-[#8a9b95]">
                        Si ya tienes un casillero, ingresalo para vincular tu tarjeta.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={registerMutation.isPending || !name.trim() || !phone.trim()}
                      className="h-14 w-full rounded-[0.55rem] bg-[#0f6b46] text-base font-semibold text-white shadow-lg shadow-[#0f6b46]/30 transition hover:bg-[#0c593b]"
                    >
                      {registerMutation.isPending ? (
                        <SpinnerLabel label="Registrando..." />
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-5 w-5" />
                          Registrarme
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs leading-5 text-[#748680]">
                      Al registrarte aceptas participar en el programa de fidelidad de EnviosRD.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
