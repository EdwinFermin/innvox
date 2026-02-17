"use client";

import { ReactNode, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { AppLoading } from "@/components/ui/app-loading";
import { auth, db } from "@/lib/firebase";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { useAuthStore } from "@/store/auth";
import { User } from "@/types/auth.types";

export function ClientRoot({ children }: { children: ReactNode }) {
  const { setUser, setLoading, clear, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        clear();
        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);

        const data = snap.data();
        if (!data) {
          setUser(null);
          return;
        }

        const profile = {
          id: u.uid,
          branchIds: [],
          ...(data as Omit<User, "id">),
        };

        setUser(profile);
      } catch (err) {
        console.error("Error loading user profile", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, setUser, setLoading, clear]);

  return (
    <>
      <ReactQueryProvider>{loading ? <AppLoading /> : children}</ReactQueryProvider>
      <Toaster />
    </>
  );
}
