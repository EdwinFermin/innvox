"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { applyCuadreSync, fetchCuadre } from "@/actions/cuadres";
import { DashboardPageHeader } from "@/components/ui/dashboard-page-header";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/use-branches";
import type {
  CuadreDateInput,
  CuadreFetchResult,
  CuadreSyncAssignment,
} from "@/types/cuadre.types";
import { getTodayDateKey } from "@/utils/dates";

import { LastSyncCard } from "./components/last-sync-card";
import { SyncCuadresForm } from "./components/sync-cuadres-form";
import { CuadreTransactionsTable } from "./components/cuadre-transactions-table";

export default function SyncCuadresPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: branches } = useBranches(
    user?.id || "",
    user?.type === "USER" ? user?.branch_ids : undefined,
  );

  const isAdmin = user?.type === "ADMIN";

  const [branchId, setBranchId] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(getTodayDateKey());
  const [endDate, setEndDate] = React.useState<string>(getTodayDateKey());
  const [rangeMode, setRangeMode] = React.useState<boolean>(false);
  const [cuadre, setCuadre] = React.useState<CuadreFetchResult | null>(null);
  const [assignments, setAssignments] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!isAdmin && rangeMode) setRangeMode(false);
  }, [isAdmin, rangeMode]);

  const dateInput = React.useMemo<CuadreDateInput>(
    () =>
      rangeMode
        ? { mode: "range", startDate: date, endDate }
        : { mode: "single", date },
    [rangeMode, date, endDate],
  );

  const eligibleBranches = React.useMemo(
    () =>
      branches.filter(
        (branch) => branch.enviosrd_branch_key && branch.default_cash_account_id,
      ),
    [branches],
  );

  React.useEffect(() => {
    if (!branchId && eligibleBranches.length === 1) {
      setBranchId(eligibleBranches[0].id);
    }
  }, [branchId, eligibleBranches]);

  const selectedBranch = React.useMemo(
    () => branches.find((b) => b.id === branchId) ?? null,
    [branches, branchId],
  );

  const fetchMutation = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Selecciona una sucursal.");
      return fetchCuadre(branchId, dateInput);
    },
    onSuccess: (data) => {
      setCuadre(data);
      setAssignments({});
      if (data.prepared.length === 0) {
        toast.info("El cuadre no tiene transacciones.");
      }
    },
    onError: (error: Error) => {
      setCuadre(null);
      toast.error(error.message);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!cuadre || !branchId) throw new Error("No hay cuadre cargado.");
      const transferAssignments: CuadreSyncAssignment[] = cuadre.prepared
        .filter((t) => t.kind === "transferencia" && !t.alreadySynced)
        .map((t) => ({
          external_ref: t.external_ref,
          bank_account_id: assignments[t.external_ref],
        }));
      return applyCuadreSync({ branchId, dateInput, assignments: transferAssignments });
    },
    onSuccess: (result) => {
      toast.success(
        `${result.created_count} ingresos creados${result.skipped_count > 0 ? `, ${result.skipped_count} ya estaban sincronizadas` : ""}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["cuadre_syncs"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      setCuadre(null);
      setAssignments({});
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="dashboard-grid w-full">
      <DashboardPageHeader
        eyebrow="Integraciones"
        title="Sincronización de Cuadres"
        description="Importa los cuadres diarios de Envios RD a Innvox como ingresos por sucursal."
      />

      <LastSyncCard userId={user?.id || ""} branches={branches} />

      <SyncCuadresForm
        branches={branches}
        eligibleBranches={eligibleBranches}
        branchId={branchId}
        date={date}
        endDate={endDate}
        rangeMode={rangeMode}
        isAdmin={isAdmin}
        onBranchChange={(val) => {
          setBranchId(val);
          setCuadre(null);
        }}
        onDateChange={(val) => {
          setDate(val);
          setCuadre(null);
        }}
        onEndDateChange={(val) => {
          setEndDate(val);
          setCuadre(null);
        }}
        onRangeModeChange={(val) => {
          setRangeMode(val);
          setCuadre(null);
          setAssignments({});
        }}
        onLoad={() => fetchMutation.mutate()}
        loading={fetchMutation.isPending}
      />

      {cuadre && selectedBranch && (
        <CuadreTransactionsTable
          cuadre={cuadre}
          branch={selectedBranch}
          assignments={assignments}
          showDateColumn={rangeMode}
          onAssignmentChange={(ref, accountId) =>
            setAssignments((prev) => ({ ...prev, [ref]: accountId }))
          }
          onSubmit={() => applyMutation.mutate()}
          submitting={applyMutation.isPending}
        />
      )}
    </div>
  );
}
