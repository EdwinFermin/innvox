"use client";

import { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/providers/session-provider";
import { ReactQueryProvider } from "@/providers/react-query-provider";

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <ReactQueryProvider>{children}</ReactQueryProvider>
      <Toaster />
    </AuthSessionProvider>
  );
}
