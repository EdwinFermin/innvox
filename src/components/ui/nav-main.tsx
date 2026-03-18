"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { IconType } from "react-icons/lib";
import Link from "next/link";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url?: string;
    icon: LucideIcon | IconType;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const isInternalUrl = (url: string) => url.startsWith("/");
  const isItemActive = (url?: string, subItems?: { title: string; url: string }[]) => {
    if (url && pathname === url) return true;
    return subItems?.some((subItem) => pathname === subItem.url || pathname.startsWith(`${subItem.url}/`)) ?? false;
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/45">
        Workspace
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const active = isItemActive(item.url, item.items);

          return (
          <Collapsible key={`${item.title}-${pathname}`} asChild defaultOpen={active || item.isActive}>
            <SidebarMenuItem>
              {Boolean(item.url) ? (
                <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                  {isInternalUrl(item.url!) ? (
                    <Link href={item.url!} aria-current={active ? "page" : undefined}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  ) : (
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  )}
                </SidebarMenuButton>
              ) : (
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={active}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              )}
              {Boolean(item.items?.length) ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.url || pathname.startsWith(`${subItem.url}/`)}>
                            {isInternalUrl(subItem.url) ? (
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            ) : (
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            )}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        )})}
      </SidebarMenu>
    </SidebarGroup>
  );
}
