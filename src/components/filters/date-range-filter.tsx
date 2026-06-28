"use client";

import * as React from "react";

import { getDateInputValue } from "@/utils/dates";

type DateRangeFilterProps = {
  startDate: string; // "YYYY-MM-DD" or ""
  endDate: string; // "YYYY-MM-DD" or ""
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  startLabel?: string; // default "Desde"
  endLabel?: string; // default "Hasta"
};

/**
 * A pair of native `<input type="date">` controls ("Desde" / "Hasta"). Native
 * inputs only — this component introduces no calendar dependency (table-filters
 * R5, R6, R7). Values are normalized through `getDateInputValue` so the same
 * date strings the incomes/expenses pages stored continue to render correctly.
 */
export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "Desde",
  endLabel = "Hasta",
}: DateRangeFilterProps): React.JSX.Element {
  // Stable ids associate each label with its input so screen readers announce
  // "Desde"/"Hasta" for the focused date input.
  const startId = React.useId();
  const endId = React.useId();

  return (
    <>
      <div className="space-y-1">
        <label
          htmlFor={startId}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {startLabel}
        </label>
        <input
          id={startId}
          type="date"
          value={getDateInputValue(startDate)}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-input bg-background px-3"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor={endId}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {endLabel}
        </label>
        <input
          id={endId}
          type="date"
          value={getDateInputValue(endDate)}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-input bg-background px-3"
        />
      </div>
    </>
  );
}
