"use client";

import * as React from "react";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
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
    <div className="@container/main flex flex-1 flex-col gap-4">
      <div className="dashboard-grid py-1 md:gap-6 md:py-2">
        <DashboardHero />
        <SectionCards />
        <div>
          <ChartAreaInteractive />
        </div>
        <BusinessWidgets />
      </div>
    </div>
  );
}
