"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/providers/session-provider";
import { ReactQueryProvider } from "@/providers/react-query-provider";

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthSessionProvider>
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <Toaster />
      </AuthSessionProvider>
    </ThemeProvider>
  );
}
