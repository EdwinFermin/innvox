"use client";

import * as React from "react";
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive";
import { SectionCards } from "@/components/dashboard/section-cards";

export function DashboardHomeContent() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 rounded-xl border bg-card" />
            ))}
          </div>
          <div className="px-4 lg:px-6">
            <div className="h-[320px] rounded-xl border bg-card" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
      </div>
    </div>
  );
}
