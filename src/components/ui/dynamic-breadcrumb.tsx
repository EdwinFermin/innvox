"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function translateSegment(segment: string): string {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    invoices: "Facturas",
    settings: "Configuración",
    clients: "Clientes",
    users: "Usuarios",
    profile: "Perfil",
  };

  return (
    map[segment.toLowerCase()] ||
    segment.charAt(0).toUpperCase() + segment.slice(1)
  );
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const paths = segments.map((segment, index) => ({
    name: translateSegment(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {paths.map((p, i) => (
          <BreadcrumbItem key={i}>
            <BreadcrumbLink asChild>
              <Link href={p.href}>{p.name}</Link>
            </BreadcrumbLink>
            {i < paths.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
