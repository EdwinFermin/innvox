import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardChartSkeleton({
  className = "h-[320px]",
}: {
  className?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${className}`} />
      </CardContent>
    </Card>
  );
}

export function DashboardWidgetsSkeleton() {
  // Single-column with two stacked cards to mirror the populated BusinessWidgets
  // layout (Actividad reciente list card + Pulso por sucursal chart card), so the
  // skeleton-to-content swap does not shift the layout.
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6">
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <DashboardChartSkeleton className="h-[280px]" />
    </div>
  );
}

export function DashboardHomeLoading() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <DashboardChartSkeleton />
        </div>
        <DashboardWidgetsSkeleton />
      </div>
    </div>
  );
}
