"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { adjustTokens } from "@/actions/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerLabel } from "@/components/ui/spinner-label";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Client } from "@/types/client.types";
import { TokenDots } from "../components/token-dots";

export default function ScannerPage() {
  const [scannedClient, setScannedClient] = React.useState<Client | null>(null);
  const [manualId, setManualId] = React.useState("");
  const [isScanning, setIsScanning] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const scannerRef = React.useRef<HTMLDivElement>(null);
  const html5QrCodeRef = React.useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const queryClient = useQueryClient();

  const fetchClient = React.useCallback(async (clientId: string) => {
    setIsFetching(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error(`Cliente no encontrado: ${clientId}`);
        return;
      }

      setScannedClient({ ...data, po_box: data.id } as Client);
    } catch {
      toast.error("Error al buscar el cliente");
    } finally {
      setIsFetching(false);
    }
  }, []);

  const startScanner = React.useCallback(async () => {
    if (!scannerRef.current) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-scanner-container");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          fetchClient(decodedText);
          scanner.pause(true);
          setTimeout(() => {
            try {
              scanner.resume();
            } catch {
              // scanner may have been stopped
            }
          }, 2000);
        },
        () => {},
      );
      setIsScanning(true);
    } catch {
      toast.error("No se pudo acceder a la camara");
    }
  }, [fetchClient]);

  const stopScanner = React.useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // already stopped
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const addTokenMutation = useMutation({
    mutationFn: async () => {
      if (!scannedClient) return;
      return adjustTokens(scannedClient.id, 1, "scan");
    },
    onSuccess: (result) => {
      if (!result) return;
      queryClient.invalidateQueries({ queryKey: ["loyalty-clients"] });

      setScannedClient((prev) =>
        prev ? { ...prev, tokens: result.new_tokens } : null,
      );

      if (result.was_reset) {
        toast.success("Tarjeta completa! Recompensa otorgada.", {
          duration: 5000,
        });
      } else {
        toast.success(`Token agregado (${result.new_tokens}/8)`);
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al agregar token",
      );
    },
  });

  const handleManualSearch = () => {
    const id = manualId.trim();
    if (id) {
      fetchClient(id);
      setManualId("");
    }
  };

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Fidelidad"
        title="Scanner"
        description="Escanea el QR del cliente para agregar un token a su tarjeta de fidelidad."
      />

      <div className="dashboard-panel p-4 sm:p-6">
        <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-2">
          {/* Camera section */}
          <div className="space-y-4">
            <div
              id="qr-scanner-container"
              ref={scannerRef}
              className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-border bg-slate-50"
            >
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                  <Camera className="h-12 w-12" />
                  <p className="text-sm">Presiona iniciar para abrir la camara</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isScanning ? (
                <Button
                  onClick={startScanner}
                  className="h-11 w-full rounded-2xl"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Iniciar camara
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={stopScanner}
                  className="h-11 w-full rounded-2xl"
                >
                  Detener camara
                </Button>
              )}
            </div>

            {/* Manual search */}
            <div className="flex gap-2">
              <Input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Buscar por casillero..."
                className="h-11 rounded-2xl border-border/70"
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              />
              <Button
                variant="outline"
                onClick={handleManualSearch}
                className="h-11 shrink-0 rounded-2xl"
                disabled={!manualId.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Client result section */}
          <div className="space-y-4">
            {isFetching ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border/70 bg-slate-50/70">
                <SpinnerLabel label="Buscando cliente..." />
              </div>
            ) : scannedClient ? (
              <div className="space-y-4 rounded-2xl border border-border/70 bg-slate-50/70 p-5 sm:p-6">
                <div className="space-y-1 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Cliente
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {scannedClient.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {scannedClient.po_box}
                    {scannedClient.phone && ` · ${scannedClient.phone}`}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-background p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Tokens
                  </p>
                  <TokenDots tokens={scannedClient.tokens} size="lg" />
                  <p className="text-3xl font-semibold tracking-tight">
                    {scannedClient.tokens} / 8
                  </p>
                </div>

                <Button
                  onClick={() => addTokenMutation.mutate()}
                  disabled={addTokenMutation.isPending}
                  className="h-14 w-full rounded-2xl text-lg font-semibold"
                >
                  {addTokenMutation.isPending ? (
                    <SpinnerLabel label="Procesando..." />
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Agregar token
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setScannedClient(null)}
                  className="h-11 w-full rounded-2xl"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Escanear otro
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-slate-50/60 text-center text-muted-foreground">
                <Search className="h-10 w-10" />
                <div>
                  <p className="font-medium">Sin cliente seleccionado</p>
                  <p className="mt-1 text-sm">
                    Escanea un QR o busca manualmente por casillero
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
