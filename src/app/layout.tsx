"use client";

import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { auth, db } from "@/lib/firebase";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { useAuthStore } from "@/store/auth";
import { User } from "@/types/auth.types";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const { setUser, setLoading, clear } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        clear();
        setLoading(false);
        router.replace("/login");
        return;
      }

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      setUser(snap.data() as User);
      setLoading(false);
    });

    return () => unsub();
  }, [router, setUser, setLoading, clear]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
