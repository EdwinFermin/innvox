"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch } from "@/types/branch.types";

interface SyncCuadresFormProps {
  branches: Branch[];
  eligibleBranches: Branch[];
  branchId: string;
  date: string;
  onBranchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onLoad: () => void;
  loading: boolean;
}

export function SyncCuadresForm({
  branches,
  eligibleBranches,
  branchId,
  date,
  onBranchChange,
  onDateChange,
  onLoad,
  loading,
}: SyncCuadresFormProps) {
  const hasEligible = eligibleBranches.length > 0;
  const missingConfig = branches.filter(
    (b) => !b.enviosrd_branch_key || !b.default_cash_account_id,
  );

  return (
    <div className="dashboard-panel grid w-full gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="dashboard-field">
        <label className="dashboard-field-label">Sucursal</label>
        <Select
          value={branchId}
          onValueChange={onBranchChange}
          disabled={loading || !hasEligible}
        >
          <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background">
            <SelectValue placeholder="Selecciona una sucursal" />
          </SelectTrigger>
          <SelectContent>
            {eligibleBranches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name} ({branch.enviosrd_branch_key})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasEligible && (
          <p className="dashboard-field-hint">
            Ninguna sucursal tiene configurada la clave Envios RD y la cuenta de caja por
            defecto. Configúralas en /dashboard/branches.
          </p>
        )}
        {hasEligible && missingConfig.length > 0 && (
          <p className="dashboard-field-hint">
            {missingConfig.length} sucursal(es) sin configurar no aparecen aquí.
          </p>
        )}
      </div>

      <div className="dashboard-field">
        <label className="dashboard-field-label">Fecha del cuadre</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-11 rounded-2xl border-border/70 bg-background"
          disabled={loading}
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="default"
          className="h-11 rounded-2xl"
          disabled={!branchId || !date || loading}
          onClick={onLoad}
        >
          {loading ? "Cargando…" : "Cargar cuadre"}
        </Button>
      </div>
    </div>
  );
}
