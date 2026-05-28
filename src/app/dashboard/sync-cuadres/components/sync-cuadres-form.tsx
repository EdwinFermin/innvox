"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  endDate: string;
  rangeMode: boolean;
  isAdmin: boolean;
  onBranchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRangeModeChange: (value: boolean) => void;
  onLoad: () => void;
  loading: boolean;
}

export function SyncCuadresForm({
  branches,
  eligibleBranches,
  branchId,
  date,
  endDate,
  rangeMode,
  isAdmin,
  onBranchChange,
  onDateChange,
  onEndDateChange,
  onRangeModeChange,
  onLoad,
  loading,
}: SyncCuadresFormProps) {
  const hasEligible = eligibleBranches.length > 0;
  const missingConfig = branches.filter(
    (b) => !b.enviosrd_branch_key || !b.default_cash_account_id,
  );
  const rangeInvalid = rangeMode && (!endDate || endDate < date);
  const canLoad = Boolean(branchId) && Boolean(date) && !rangeInvalid && !loading;

  return (
    <div className="dashboard-panel flex flex-col gap-4 p-4">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="cuadre-range-mode"
            checked={rangeMode}
            onCheckedChange={(value) => onRangeModeChange(value === true)}
            disabled={loading}
          />
          <label htmlFor="cuadre-range-mode" className="cursor-pointer text-sm">
            Buscar por rango de fechas
          </label>
        </div>
      )}

      <div
        className={
          rangeMode
            ? "grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            : "grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        }
      >
        <div className="dashboard-field">
          <label className="dashboard-field-label">Sucursal</label>
          <Select
            value={branchId}
            onValueChange={onBranchChange}
            disabled={loading || !hasEligible}
          >
            <SelectTrigger className="h-11 w-full rounded-2xl border-border/70 bg-background data-[size=default]:h-11">
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
          <label className="dashboard-field-label">
            {rangeMode ? "Fecha inicio" : "Fecha del cuadre"}
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-11 rounded-2xl border-border/70 bg-background"
            disabled={loading}
            max={rangeMode && endDate ? endDate : undefined}
          />
        </div>

        {rangeMode && (
          <div className="dashboard-field">
            <label className="dashboard-field-label">Fecha fin</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-11 rounded-2xl border-border/70 bg-background"
              disabled={loading}
              min={date || undefined}
            />
            {rangeInvalid && (
              <p className="dashboard-field-hint text-destructive">
                La fecha fin debe ser mayor o igual a la fecha inicio.
              </p>
            )}
          </div>
        )}

        <div className="flex items-end">
          <Button
            type="button"
            variant="default"
            className="h-11 rounded-2xl"
            disabled={!canLoad}
            onClick={onLoad}
          >
            {loading ? "Cargando…" : "Cargar cuadre"}
          </Button>
        </div>
      </div>
    </div>
  );
}
