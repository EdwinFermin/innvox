import { AppSidebar } from "@/components/ui/app-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ReactNode } from "react";
import { DynamicBreadcrumb } from "@/components/ui/dynamic-breadcrumb";
import { requireAuth } from "@/lib/auth/guards";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAuth();

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Saltar al contenido
      </a>
      <AppSidebar />
      <SidebarInset className="dashboard-shell overflow-x-hidden bg-background">
        <header className="bg-background px-3 pt-3 sm:px-4 lg:px-5">
          <div className="dashboard-panel flex min-h-14 items-center gap-3 px-4 py-3 sm:px-5">
            <SidebarTrigger className="size-9 rounded-full border border-border/70 bg-background/80" />
            <Separator orientation="vertical" className="mr-1 hidden h-5 sm:block" />
            <div className="min-w-0 flex-1">
              <DynamicBreadcrumb />
            </div>
          </div>
        </header>

        <div className="px-3 pt-3 sm:px-4 lg:px-5">
          <DashboardTopbar />
        </div>

        <main
          id="main-content"
          className="flex min-w-0 flex-1 flex-col gap-5 bg-background px-3 py-5 sm:px-4 lg:px-5 lg:py-6"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
