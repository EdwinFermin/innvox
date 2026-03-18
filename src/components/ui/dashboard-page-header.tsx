import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DashboardPageHeaderStat = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning";
};

type DashboardPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: DashboardPageHeaderStat[];
  actions?: React.ReactNode;
  className?: string;
};

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  stats = [],
  actions,
  className,
}: DashboardPageHeaderProps) {
  const statsGridClass =
    stats.length >= 4
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 xl:min-w-[42rem]"
      : "grid-cols-1 sm:grid-cols-3 xl:min-w-[28rem]";

  return (
    <section
      className={cn(
        "dashboard-panel relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 max-w-2xl space-y-3">
          {eyebrow ? (
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary"
            >
              {eyebrow}
            </Badge>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-balance text-[clamp(1.65rem,1.25rem+1.4vw,2.6rem)] font-semibold tracking-[-0.03em] text-foreground">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[20rem] xl:items-end">
          {actions ? <div className="flex w-full flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
          {stats.length ? (
            <div className={cn("grid w-full gap-2 xl:w-auto", statsGridClass)}>
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "min-w-0 rounded-2xl border px-4 py-3 shadow-sm",
                    stat.tone === "positive" &&
                      "border-emerald-200/80 bg-emerald-50/80 text-emerald-950",
                    stat.tone === "warning" &&
                      "border-amber-200/80 bg-amber-50/80 text-amber-950",
                    (!stat.tone || stat.tone === "neutral") &&
                      "border-border/70 bg-background/75 text-foreground",
                  )}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="mt-2 truncate text-[clamp(1rem,0.95rem+0.24vw,1.125rem)] font-semibold tracking-[-0.03em]">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
