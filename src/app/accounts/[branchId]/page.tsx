"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Check, Copy } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { isSafeAccountImageSrc } from "@/lib/bank-accounts";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PublicBankAccount = {
  id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string | null;
  currency: string;
  icon_url: string | null;
  account_type: string;
};

function CopyAccountNumberButton({ accountNumber }: { accountNumber: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast.success("Numero de cuenta copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el numero");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2 border-[#d9e5db] text-[#0f6b46] hover:bg-[#eef7ef] hover:text-[#0c593b]"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copiar
        </>
      )}
    </Button>
  );
}

export default function PublicBranchAccountsPage() {
  const params = useParams<{ branchId: string | string[] }>();
  const rawBranchId = params.branchId;
  const branchId = decodeURIComponent(
    Array.isArray(rawBranchId) ? (rawBranchId[0] ?? "") : (rawBranchId ?? ""),
  );

  const accountsQuery = useQuery({
    queryKey: ["public-branch-accounts", branchId],
    queryFn: async (): Promise<PublicBankAccount[]> => {
      const supabase = getSupabaseBrowserClient();

      // Find bank_account IDs linked to this branch via the junction table
      const { data: junctionRows, error: junctionError } = await supabase
        .from("bank_account_branches")
        .select("bank_account_id")
        .eq("branch_id", branchId);

      if (junctionError) throw junctionError;

      const accountIds = (junctionRows ?? []).map((r) => r.bank_account_id);

      if (accountIds.length === 0) return [];

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, account_name, bank_name, account_number, currency, icon_url, account_type")
        .in("id", accountIds)
        .eq("is_active", true)
        .eq("account_type", "bank")
        .eq("is_public", true);

      if (error) throw error;

      return (data ?? []) as PublicBankAccount[];
    },
    enabled: !!branchId,
  });

  const accounts = accountsQuery.data ?? [];
  const isLoading = accountsQuery.isLoading;
  const hasError = accountsQuery.isError;

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
                  Cuentas bancarias disponibles para realizar tu pago.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="flex-1 py-6">
          <div className="w-full max-w-2xl mx-auto">
            {isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center rounded-[0.7rem] border border-[#d7dfd1] bg-white/95 shadow-[0_30px_90px_rgba(0,44,90,0.16)] p-8">
                <div className="rounded-full bg-[#eef7ef] p-4 text-[#0f6b46]">
                  <Banknote className="h-7 w-7" />
                </div>
                <SpinnerLabel label="Cargando cuentas bancarias..." />
              </div>
            ) : accounts.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a6806]">
                    Cuentas bancarias
                  </p>
                  <p className="mt-1 text-sm text-[#647570]">
                    Selecciona una cuenta y copia el numero para realizar tu transferencia.
                  </p>
                </div>

                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="overflow-hidden rounded-[0.7rem] border border-[#d7dfd1] bg-white/95 shadow-[0_8px_30px_rgba(0,44,90,0.08)]"
                  >
                    <div className="px-5 py-4 sm:px-6">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 mt-0.5">
                          {isSafeAccountImageSrc(account.icon_url) ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={account.icon_url!}
                              alt=""
                              className="h-12 w-12 rounded-lg border border-[#d9e5db] object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#d9e5db] bg-[#f2f7f0] text-sm font-semibold text-[#0f6b46]">
                              BK
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0d2d4f] truncate">
                                {account.bank_name || "Cuenta bancaria"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-[#d9e5db] bg-[#f2f7f0] px-2.5 py-0.5 text-xs font-semibold text-[#0f6b46]">
                              {account.currency}
                            </span>
                          </div>

                          {account.account_number && (
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1 rounded-lg border border-dashed border-[#d9e5db] bg-[#f8fbf7] px-3 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a9b95]">
                                  No. de cuenta
                                </p>
                                <p className="mt-0.5 font-mono text-base font-semibold tracking-wide text-[#0d2d4f]">
                                  {account.account_number}
                                </p>
                              </div>
                              <CopyAccountNumberButton accountNumber={account.account_number} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center rounded-[0.7rem] border border-[#d7dfd1] bg-white/95 shadow-[0_30px_90px_rgba(0,44,90,0.16)] p-8">
                <div className="rounded-full bg-[#fff5d7] p-4 text-[#b47a00]">
                  <Banknote className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-[#0d2d4f]">
                    No hay cuentas disponibles
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#647570]">
                    Esta sucursal no tiene cuentas bancarias disponibles en este momento.
                  </p>
                </div>
              </div>
            )}

            {hasError && (
              <div className="mt-6 rounded-[0.6rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                No se pudieron cargar las cuentas bancarias. Intenta nuevamente en unos minutos.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
