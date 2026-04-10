"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Search, UserPlus, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { searchEnviosRDClient } from "@/actions/enviosrd";
import { registerLoyaltyClient } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { WalletButtons } from "./components/wallet-buttons";

type Step = "lookup" | "confirm" | "manual" | "done";

export default function LoyaltyRegisterPage() {
  const [step, setStep] = React.useState<Step>("lookup");
  const [code, setCode] = React.useState("");

  // Client data (from API or manual entry)
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [poBox, setPoBox] = React.useState("");
  const [oficina, setOficina] = React.useState("");

  const [registeredClientId, setRegisteredClientId] = React.useState<string | null>(null);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  };

  const formatPoBox = (value: string) => {
    const upper = value.toUpperCase();
    if (/^\d/.test(upper)) {
      const digits = upper.replace(/\D/g, "");
      return `EV-${digits}`;
    }
    const match = upper.match(/^([A-Z]{1,2})-?(\d*)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2];
      return digits ? `${prefix}-${digits}` : prefix;
    }
    return upper.replace(/[^A-Z0-9-]/g, "");
  };

  const lookupMutation = useMutation({
    mutationFn: async () => {
      return searchEnviosRDClient(code.trim());
    },
    onSuccess: (client) => {
      if (client) {
        setName(client.nombre);
        setPhone(client.telefono ? formatPhone(client.telefono) : "");
        setEmail(client.email ?? "");
        setPoBox(`EV-${client.codigo}`);
        setOficina(client.oficina);
        setStep("confirm");
      } else {
        toast.error("Codigo no encontrado. Puedes registrarte manualmente.");
        setStep("manual");
      }
    },
    onError: () => {
      toast.error("Error al buscar. Intenta de nuevo o registrate manualmente.");
      setStep("manual");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      return registerLoyaltyClient({
        name: name.trim(),
        phone: phone.replace(/\./g, "").trim(),
        email: email.trim() || undefined,
        po_box: poBox.trim(),
      });
    },
    onSuccess: (result) => {
      setRegisteredClientId(result.clientId);
      setStep("done");
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

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    lookupMutation.mutate();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !poBox.trim()) return;
    registerMutation.mutate();
  };

  const resetToLookup = () => {
    setStep("lookup");
    setCode("");
    setName("");
    setPhone("");
    setEmail("");
    setPoBox("");
    setOficina("");
    lookupMutation.reset();
    registerMutation.reset();
  };

  const stepLabel = {
    lookup: "Buscar cuenta",
    confirm: "Confirmar datos",
    manual: "Registro manual",
    done: "Registro completo",
  };

  const stepDescription = {
    lookup: "Ingresa tu codigo de cliente para buscar tu informacion.",
    confirm: "Verifica que tus datos sean correctos antes de continuar.",
    manual: "Completa tus datos para unirte al programa de fidelidad.",
    done: "Agrega tu tarjeta a tu billetera digital.",
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
                  Registrate y acumula tokens con cada visita. Al completar 10 tokens recibes tu recompensa.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-stretch py-6">
          <div className="relative flex w-full flex-col">
            <div className="absolute inset-x-6 top-4 -z-10 h-full rounded-[0.8rem] bg-[#e6a815]/20 blur-3xl" />
            <div className="flex flex-1 flex-col overflow-hidden rounded-[0.7rem] border border-[#d7dfd1] bg-white/95 shadow-[0_30px_90px_rgba(0,44,90,0.16)]">
              <div className="border-b border-[#e8ede6] bg-[linear-gradient(180deg,#fffaf0_0%,#ffffff_100%)] px-6 py-5 sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9c6f04]">
                  {stepLabel[step]}
                </p>
                <p className="mt-2 text-sm text-[#647570]">
                  {stepDescription[step]}
                </p>
              </div>

              <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-8">
                {/* Step: Lookup by code */}
                {step === "lookup" && (
                  <form onSubmit={handleLookup} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#0d2d4f]">
                        Codigo de cliente *
                      </label>
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="Ej: 111494"
                        required
                        inputMode="numeric"
                        className="h-12 rounded-xl border-[#d7dfd1] bg-white text-base"
                      />
                      <p className="text-xs text-[#8a9b95]">
                        Ingresa el codigo numerico que te asigno EnviosRD.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={lookupMutation.isPending || !code.trim()}
                      className="h-14 w-full rounded-[0.55rem] bg-[#0f6b46] text-base font-semibold text-white shadow-lg shadow-[#0f6b46]/30 transition hover:bg-[#0c593b]"
                    >
                      {lookupMutation.isPending ? (
                        <SpinnerLabel label="Buscando..." />
                      ) : (
                        <>
                          <Search className="mr-2 h-5 w-5" />
                          Buscar
                        </>
                      )}
                    </Button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-[#e8ede6]" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-[#8a9b95]">o</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep("manual")}
                      className="w-full text-center text-sm font-medium text-[#0f6b46] hover:underline"
                    >
                      Registrarme manualmente
                    </button>
                  </form>
                )}

                {/* Step: Confirm API data */}
                {step === "confirm" && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-[#d7dfd1] bg-[#f8faf7] p-5 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-[#8a9b95]">Nombre</p>
                        <p className="text-base font-semibold text-[#0d2d4f]">{name}</p>
                      </div>
                      {phone && (
                        <div>
                          <p className="text-xs font-medium text-[#8a9b95]">Telefono</p>
                          <p className="text-base text-[#0d2d4f]">{phone}</p>
                        </div>
                      )}
                      {email && (
                        <div>
                          <p className="text-xs font-medium text-[#8a9b95]">Email</p>
                          <p className="text-base text-[#0d2d4f]">{email}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-[#8a9b95]">Casillero</p>
                        <p className="text-base text-[#0d2d4f]">{poBox}</p>
                      </div>
                      {oficina && (
                        <div>
                          <p className="text-xs font-medium text-[#8a9b95]">Oficina</p>
                          <p className="text-base text-[#0d2d4f]">{oficina}</p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => registerMutation.mutate()}
                      disabled={registerMutation.isPending}
                      className="h-14 w-full rounded-[0.55rem] bg-[#0f6b46] text-base font-semibold text-white shadow-lg shadow-[#0f6b46]/30 transition hover:bg-[#0c593b]"
                    >
                      {registerMutation.isPending ? (
                        <SpinnerLabel label="Registrando..." />
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-5 w-5" />
                          Confirmar y registrarme
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={resetToLookup}
                      className="flex w-full items-center justify-center gap-1 text-sm font-medium text-[#647570] hover:text-[#0d2d4f]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver a buscar
                    </button>
                  </div>
                )}

                {/* Step: Manual entry */}
                {step === "manual" && (
                  <form onSubmit={handleRegister} className="space-y-5">
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
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        placeholder="000.000.0000"
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
                        Casillero *
                      </label>
                      <Input
                        value={poBox}
                        onChange={(e) => setPoBox(formatPoBox(e.target.value))}
                        placeholder="EV-00000"
                        required
                        className="h-12 rounded-xl border-[#d7dfd1] bg-white text-base"
                      />
                      <p className="text-xs text-[#8a9b95]">
                        Ingresa tu numero de casillero para vincular tu tarjeta.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={registerMutation.isPending || !name.trim() || !phone.trim() || !poBox.trim()}
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

                    <button
                      type="button"
                      onClick={resetToLookup}
                      className="flex w-full items-center justify-center gap-1 text-sm font-medium text-[#647570] hover:text-[#0d2d4f]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver a buscar con codigo
                    </button>

                    <p className="text-center text-xs leading-5 text-[#748680]">
                      Al registrarte aceptas participar en el programa de fidelidad de EnviosRD.
                    </p>
                  </form>
                )}

                {/* Step: Done */}
                {step === "done" && registeredClientId && (
                  <div className="space-y-6 text-center">
                    <div className="inline-flex rounded-full bg-[#eef7ef] p-4 text-[#0f6b46]">
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

                    <WalletButtons clientId={registeredClientId} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
