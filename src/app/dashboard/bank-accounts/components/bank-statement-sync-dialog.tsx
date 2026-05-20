"use client";

import * as React from "react";
import {
  FileUp,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { createBankStatementImport } from "@/actions/bank-statement-sync";
import {
  diagnoseAccountBalance,
  recomputeAccountBalance,
  repairRunningBalances,
} from "@/actions/account-reconciliation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseBankStatementPdf } from "@/lib/bank-statement-parser";
import { cn } from "@/lib/utils";
import type { BankAccount } from "@/types/bank-account.types";
import type { AccountBalanceDiagnosis } from "@/types/account-reconciliation.types";
import type { BankStatementImportPreview } from "@/types/bank-statement-sync.types";

interface BankStatementSyncDialogProps {
  account: BankAccount;
  onSynced?: () => void;
  children?: React.ReactNode;
}

const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export function BankStatementSyncDialog({
  account,
  onSynced,
  children,
}: BankStatementSyncDialogProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [diagnosis, setDiagnosis] = React.useState<AccountBalanceDiagnosis | null>(null);
  const [isDiagnosing, setIsDiagnosing] = React.useState(false);
  const [isRepairing, setIsRepairing] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [previews, setPreviews] = React.useState<BankStatementImportPreview[]>([]);

  const currency = account.currency;

  const runDiagnosis = React.useCallback(async () => {
    setIsDiagnosing(true);
    try {
      const result = await diagnoseAccountBalance({ bankAccountId: account.id });
      setDiagnosis(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo diagnosticar la cuenta.");
    } finally {
      setIsDiagnosing(false);
    }
  }, [account.id]);

  React.useEffect(() => {
    if (open) {
      void runDiagnosis();
    } else {
      setDiagnosis(null);
      setPreviews([]);
      setIsAnalyzing(false);
      setIsRepairing(false);
    }
  }, [open, runDiagnosis]);

  const handleRecompute = React.useCallback(async () => {
    setIsRepairing(true);
    try {
      const result = await recomputeAccountBalance({ bankAccountId: account.id });
      toast.success(
        `Balance corregido: ${formatCurrency(result.previous_balance, currency)} → ${formatCurrency(result.new_balance, currency)}`,
      );
      await runDiagnosis();
      onSynced?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo corregir el balance.");
    } finally {
      setIsRepairing(false);
    }
  }, [account.id, currency, onSynced, runDiagnosis]);

  const handleRepairRunning = React.useCallback(async () => {
    setIsRepairing(true);
    try {
      await repairRunningBalances({ bankAccountId: account.id });
      toast.success("Balances corridos reordenados por fecha.");
      await runDiagnosis();
      onSynced?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron reparar los balances.");
    } finally {
      setIsRepairing(false);
    }
  }, [account.id, onSynced, runDiagnosis]);

  const handleFiles = React.useCallback(
    async (files: FileList | null) => {
      const selectedFiles = Array.from(files ?? []);
      if (selectedFiles.length === 0) return;

      setIsAnalyzing(true);
      try {
        const nextPreviews: BankStatementImportPreview[] = [];
        for (const file of selectedFiles) {
          if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            toast.error(`${file.name} no es un PDF válido.`);
            continue;
          }
          const parsedStatement = await parseBankStatementPdf(file);
          const preview = await createBankStatementImport({
            bankAccountId: account.id,
            fileName: file.name,
            fileSize: file.size,
            parsedStatement,
          });
          nextPreviews.push(preview);
        }

        if (nextPreviews.length === 0) {
          toast.error("No se pudo analizar ningún archivo.");
          return;
        }

        setPreviews(nextPreviews);
        toast.success("Estado de cuenta conciliado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo analizar el PDF.");
      } finally {
        setIsAnalyzing(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [account.id],
  );

  const hasPhantom = !!diagnosis && Math.abs(diagnosis.phantom_offset) >= 0.01;
  const hasChainIssue =
    !!diagnosis && (diagnosis.chain_breaks > 0 || !diagnosis.last_balance_after_matches);
  const isHealthy = !!diagnosis && !hasPhantom && !hasChainIssue;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" className="rounded-2xl">
            <Stethoscope className="mr-2 h-4 w-4" />
            Conciliar / diagnosticar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)] xl:max-w-[1100px]">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Diagnóstico y conciliación de cuenta</DialogTitle>
          <DialogDescription>
            Detecta valores fantasma e incongruencias de balance, y concilia contra los estados del banco.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 py-5 sm:px-6">
          {/* ---- Integridad de la cuenta ---- */}
          <section className="grid gap-3 rounded-2xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Stethoscope className="h-4 w-4" />
                Integridad de la cuenta
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => void runDiagnosis()}
                disabled={isDiagnosing || isRepairing}
              >
                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isDiagnosing && "animate-spin")} />
                Revisar
              </Button>
            </div>

            {isDiagnosing && !diagnosis ? (
              <p className="text-sm text-muted-foreground">Analizando transacciones...</p>
            ) : diagnosis ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DiagnosisCell label="Balance actual" value={formatCurrency(diagnosis.current_balance, currency)} />
                  <DiagnosisCell label="Apertura" value={formatCurrency(diagnosis.opening_balance, currency)} />
                  <DiagnosisCell label="Σ movimientos" value={formatCurrency(diagnosis.movements_sum, currency)} />
                  <DiagnosisCell
                    label="Balance reconstruido"
                    value={formatCurrency(diagnosis.reconstructed_balance, currency)}
                  />
                </div>

                {isHealthy ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    Cuenta consistente: el balance cuadra con sus {diagnosis.transaction_count} transacciones y los balances corridos están en orden.
                  </div>
                ) : null}

                {hasPhantom ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <strong>Valor fantasma de {formatCurrency(diagnosis.phantom_offset, currency)}</strong>: el balance no
                        sale de ninguna transacción (apertura + Σ = {formatCurrency(diagnosis.reconstructed_balance, currency)}).
                        Recalcular lo corrige sin rellenar.
                      </span>
                    </span>
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={() => void handleRecompute()}
                      disabled={isRepairing}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Recalcular balance
                    </Button>
                  </div>
                ) : null}

                {hasChainIssue ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Balances corridos inconsistentes
                        {diagnosis.chain_breaks > 0 ? ` (${diagnosis.chain_breaks} salto(s) por fecha)` : ""}.
                        Reordenarlos no cambia el balance final.
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => void handleRepairRunning()}
                      disabled={isRepairing}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Reparar balances corridos
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No se pudo cargar el diagnóstico.</p>
            )}
          </section>

          {/* ---- Conciliación contra estado de cuenta ---- */}
          <section className="grid gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <FileUp className="h-4 w-4" />
                  Conciliación contra estado de cuenta
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sube los PDF del banco para ver qué movimientos faltan o sobran. No modifica nada.
                </p>
              </div>
              <div>
                <Input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleFiles(event.currentTarget.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  disabled={isAnalyzing}
                  onClick={() => inputRef.current?.click()}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {isAnalyzing ? "Analizando..." : "Subir PDFs"}
                </Button>
              </div>
            </div>

            {previews.map((preview) => (
              <StatementReconciliationReport
                key={preview.id}
                preview={preview}
                currency={currency}
                systemBalance={diagnosis?.current_balance ?? account.current_balance}
              />
            ))}
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/70 px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isRepairing}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiagnosisCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1 rounded-xl bg-muted/10 p-3">
      <p className="text-xs font-medium leading-4 text-muted-foreground">{label}</p>
      <p className="break-words text-base font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function StatementReconciliationReport({
  preview,
  currency,
  systemBalance,
}: {
  preview: BankStatementImportPreview;
  currency: string;
  systemBalance: number;
}) {
  const faltantes = preview.items.filter((item) => item.status === "new");
  const yaRegistrados = preview.items.filter(
    (item) => item.status === "duplicate" || item.status === "conflict",
  );
  const faltantesIn = faltantes
    .filter((i) => i.transaction_type === "deposit")
    .reduce((s, i) => s + i.amount, 0);
  const faltantesOut = faltantes
    .filter((i) => i.transaction_type === "withdrawal")
    .reduce((s, i) => s + i.amount, 0);

  const balanceGap =
    preview.closing_balance !== null
      ? Math.round((systemBalance - preview.closing_balance) * 100) / 100
      : null;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background">
      <div className="flex flex-col gap-1 border-b border-border/70 bg-muted/20 px-4 py-3">
        <div className="truncate text-base font-semibold">{preview.file_name}</div>
        <div className="truncate text-sm text-muted-foreground">
          {preview.bank_name ?? "Banco no detectado"} · {formatDate(preview.period_start)} - {formatDate(preview.period_end)}
        </div>
        {preview.issues.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {preview.issues.map((issue) => (
              <Badge key={issue} variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                {issue}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <DiagnosisCell label="Faltan en el sistema" value={String(faltantes.length)} />
        <DiagnosisCell label="Ya registrados" value={String(yaRegistrados.length)} />
        <DiagnosisCell label="Cierre del estado" value={preview.closing_balance !== null ? formatCurrency(preview.closing_balance, currency) : "-"} />
        <DiagnosisCell
          label="Diferencia con el sistema"
          value={balanceGap !== null ? formatCurrency(balanceGap, currency) : "-"}
        />
      </div>

      {faltantes.length > 0 ? (
        <div className="max-h-[360px] overflow-auto border-t border-border/70">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-36 text-right">Débito</TableHead>
                <TableHead className="w-36 text-right">Crédito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faltantes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDate(item.transaction_date)}</TableCell>
                  <TableCell className="min-w-0">
                    <div className="truncate text-sm">{item.description}</div>
                    {item.external_reference ? (
                      <div className="text-xs text-muted-foreground">Ref. {item.external_reference}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm text-rose-600">
                    {item.debit_amount ? formatCurrency(item.debit_amount, currency) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm text-emerald-600">
                    {item.credit_amount ? formatCurrency(item.credit_amount, currency) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
          Todos los movimientos del estado ya están registrados en el sistema.
        </div>
      )}

      {faltantes.length > 0 ? (
        <div className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
          Faltan registrar: <span className="font-medium text-emerald-700">+{formatCurrency(faltantesIn, currency)}</span> en
          créditos y <span className="font-medium text-rose-700">-{formatCurrency(faltantesOut, currency)}</span> en débitos.
          Regístralos como ingresos/gastos reales; no se rellenan automáticamente.
        </div>
      ) : null}
    </div>
  );
}
