"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PackageCheck } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";

import { completeLinkPayment } from "@/actions/link-payments";
import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LinkPayment } from "@/types/link-payment.types";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

export default function PublicBranchPaymentPage() {
  const params = useParams<{ branchId: string | string[] }>();
  const rawBranchId = params.branchId;
  const branchId = decodeURIComponent(
    Array.isArray(rawBranchId) ? (rawBranchId[0] ?? "") : (rawBranchId ?? ""),
  );

  const pendingPaymentQuery = useQuery({
    queryKey: ["public-link-payment", branchId],
    queryFn: async (): Promise<LinkPayment | null> => {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from("link_payments")
        .select("*")
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!branchId,
  });

  const payMutation = useMutation({
    mutationFn: async (payment: LinkPayment) => {
      await completeLinkPayment(payment.id);
      window.location.assign(payment.payment_url);
    },
  });

  const payment = pendingPaymentQuery.data;
  const isLoading = pendingPaymentQuery.isLoading;
  const hasError = pendingPaymentQuery.isError;

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
                  EnviosRD Courier
                </h1>
                <p className="mt-2 max-w-xl text-sm text-white/82 sm:text-base">
                  Completa tu pago de forma segura y continua al portal interno de la sucursal.
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
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9c6f04]">
                    Monto a pagar
                  </p>
                  <p className="mt-2 text-sm text-[#647570]">
                    Verifica el total antes de continuar al portal de pago.
                  </p>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-8">
                {isLoading ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full bg-[#eef7ef] p-4 text-[#0f6b46]">
                      <PackageCheck className="h-7 w-7" />
                    </div>
                    <SpinnerLabel label="Cargando informacion del pago..." />
                  </div>
                ) : payment ? (
                  <div className="space-y-6 text-center">
                    <div className="rounded-[0.6rem] border border-[#dfe7dc] bg-[linear-gradient(180deg,#fcfdfb_0%,#f2f7f0_100%)] px-5 py-8 shadow-inner shadow-[#0f6b46]/5">
                      <p className="text-sm uppercase tracking-[0.24em] text-[#70827c]">Total</p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight text-[#0d2d4f] sm:text-5xl">
                        {currencyFormatter.format(Number(payment.amount || 0))}
                      </p>
                    </div>

                    <div className="rounded-[0.6rem] border border-[#dce6db] bg-[#f8fbf7] p-4 text-left text-sm leading-6 text-[#556a63]">
                      Al presionar <span className="font-semibold text-[#0f6b46]">Pagar ahora</span>, seras redirigido al portal de cobro para completar la transaccion.
                    </div>

                    <Button
                      className="h-14 w-full rounded-[0.55rem] bg-[#0f6b46] text-base font-semibold text-white shadow-lg shadow-[#0f6b46]/30 transition hover:bg-[#0c593b]"
                      disabled={payMutation.isPending}
                      onClick={() => payMutation.mutate(payment)}
                    >
                      {payMutation.isPending ? "Redirigiendo..." : "Pagar ahora"}
                    </Button>

                    <p className="text-xs leading-5 text-[#748680]">
                      Si la redireccion tarda mas de lo esperado, comunicate con soporte antes de intentar nuevamente.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full bg-[#fff5d7] p-4 text-[#b47a00]">
                      <PackageCheck className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[#0d2d4f]">
                        No hay pagos pendientes
                      </p>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-[#647570]">
                        Esta sucursal no tiene un pago pendiente disponible en este momento.
                      </p>
                    </div>
                  </div>
                )}

                {hasError && (
                  <div className="mt-6 rounded-[0.6rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    No se pudo cargar el pago pendiente. Intenta nuevamente en unos minutos.
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
