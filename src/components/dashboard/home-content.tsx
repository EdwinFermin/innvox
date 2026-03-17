"use client";

import * as React from "react";
import { BusinessWidgets } from "@/components/dashboard/business-widgets";
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive";
import { DashboardHomeLoading } from "@/components/dashboard/dashboard-loading";
import { SectionCards } from "@/components/dashboard/section-cards";

export function DashboardHomeContent() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <DashboardHomeLoading />;
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <BusinessWidgets />
      </div>
    </div>
  );
}
