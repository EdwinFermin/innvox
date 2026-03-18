import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardKpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="overflow-hidden border-border/60">
          <CardHeader className="space-y-3 pb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-[1.2fr_0.8fr]">
      <DashboardChartSkeleton className="h-[280px]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <DashboardChartSkeleton className="h-[220px]" />
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
      </div>
    </div>
  );
}

export function DashboardHomeLoading() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DashboardKpiCardsSkeleton />
        <div className="px-4 lg:px-6">
          <DashboardChartSkeleton />
        </div>
        <DashboardWidgetsSkeleton />
      </div>
    </div>
  );
}
