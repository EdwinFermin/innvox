"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const themes = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeToggleItems() {
  const { setTheme, theme } = useTheme();

  return (
    <>
      {themes.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
          <Icon className="size-4" />
          {label}
          {theme === value && <Check className="ml-auto size-3.5 text-muted-foreground" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
