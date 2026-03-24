"use client";

import * as React from "react";
import { CalendarClock, ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOperatingCostAlerts } from "@/hooks/use-operating-cost-alerts";
import { can } from "@/lib/auth/can";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store/auth";
import { parseDateOnly } from "@/utils/dates";
import { OperatingCostAlert } from "@/types/operating-cost.types";
import { CompleteAlertDialog } from "@/app/dashboard/costos-operativos/components/complete-alert-dialog";

function getDaysUntil(dateValue: string) {
  const date = parseDateOnly(dateValue);
  if (!date) return Number.POSITIVE_INFINITY;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});

const COLLAPSED_COUNT = 4;

export function OperatingCostAlertsBanner() {
  const { user } = useAuthStore();
  const userId = user?.id ?? "";
  const isAdmin = can(user?.type, PERMISSIONS.settingsManage);
  const allowedBranchIds = user?.type === "USER" ? user.branch_ids : undefined;

  const { data: alerts } = useOperatingCostAlerts(userId, {
    branchIds: allowedBranchIds,
  });

  const [expanded, setExpanded] = React.useState(false);
  const [completingAlert, setCompletingAlert] = React.useState<OperatingCostAlert | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);

  const pendingAlerts = React.useMemo(
    () =>
      alerts
        .filter((a) => a.status === "pending")
        .map((a) => ({ ...a, daysUntil: getDaysUntil(a.due_date) }))
        .sort((a, b) => a.daysUntil - b.daysUntil),
    [alerts],
  );

  if (pendingAlerts.length === 0) return null;

  const overdue = pendingAlerts.filter((a) => a.daysUntil < 0);
  const hasMore = pendingAlerts.length > COLLAPSED_COUNT;
  const visibleAlerts = expanded ? pendingAlerts : pendingAlerts.slice(0, COLLAPSED_COUNT);

  const handleAlertClick = (alert: OperatingCostAlert & { daysUntil: number }) => {
    if (!isAdmin) return;
    setCompletingAlert(alert);
    setCompleteDialogOpen(true);
  };

  const hasOverdue = overdue.length > 0;

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${
          hasOverdue
            ? "border-red-300/80 bg-gradient-to-r from-red-50 via-red-50/80 to-amber-50/60 dark:border-red-800/50 dark:from-red-950/40 dark:to-amber-950/20"
            : "border-amber-200/70 bg-gradient-to-r from-amber-50/90 to-amber-50/40 dark:border-amber-800/40 dark:from-amber-950/30 dark:to-amber-950/10"
        }`}
      >
        {/* Animated accent bar */}
        <div
          className={`absolute inset-x-0 top-0 h-1 ${
            hasOverdue
              ? "bg-gradient-to-r from-red-400 via-red-500 to-amber-400 animate-pulse"
              : "bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"
          }`}
        />

        <div className="mb-3 flex items-center justify-between pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                hasOverdue
                  ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/50 dark:text-red-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
              }`}
            >
              <CalendarClock className="h-4 w-4" />
            </span>
            <div>
              <span className={`text-sm font-semibold ${hasOverdue ? "text-red-900 dark:text-red-200" : "text-amber-900 dark:text-amber-200"}`}>
                Costos operativos pendientes
              </span>
              {hasOverdue && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {overdue.length} pago{overdue.length !== 1 ? "s" : ""} vencido{overdue.length !== 1 ? "s" : ""} requiere{overdue.length === 1 ? "" : "n"} atención
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={
                hasOverdue
                  ? "border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200"
                  : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-200"
              }
            >
              {pendingAlerts.length}
            </Badge>
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2 py-1 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Ver menos" : "Ver todas"}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleAlerts.map((alert) => {
            const isOverdue = alert.daysUntil < 0;
            const isDueSoon = alert.daysUntil >= 0 && alert.daysUntil <= 3;
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => handleAlertClick(alert)}
                disabled={!isAdmin}
                className={`rounded-xl border p-3 text-left transition-all ${
                  isOverdue
                    ? "border-red-300 bg-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_2px_8px_-2px_rgba(239,68,68,0.2)]"
                    : isDueSoon
                      ? "border-amber-300 bg-amber-50/50 shadow-sm"
                      : "border-border/50 bg-white/70"
                } ${isAdmin ? "cursor-pointer hover:ring-2 hover:ring-primary/30 hover:shadow-md" : "cursor-default"}`}
              >
                <div className="truncate text-sm font-medium text-foreground">
                  {alert.operating_cost_name || "Costo operativo"}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {currencyFormatter.format(alert.default_amount)}
                  </span>
                  <span
                    className={`text-xs ${
                      isOverdue
                        ? "font-medium text-red-600"
                        : isDueSoon
                          ? "text-amber-700"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isOverdue
                      ? `Vencido hace ${Math.abs(alert.daysUntil)}d`
                      : alert.daysUntil === 0
                        ? "Vence hoy"
                        : `En ${alert.daysUntil}d`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <CompleteAlertDialog
          alert={completingAlert}
          open={completeDialogOpen}
          onOpenChange={(open) => {
            setCompleteDialogOpen(open);
            if (!open) setCompletingAlert(null);
          }}
        />
      )}
    </>
  );
}
