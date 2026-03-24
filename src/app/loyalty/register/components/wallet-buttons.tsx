"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner-label";

type WalletButtonsProps = {
  clientId: string;
};

type WalletAvailability = {
  apple: boolean;
  google: boolean;
  checked: boolean;
};

export function WalletButtons({ clientId }: WalletButtonsProps) {
  const [availability, setAvailability] = React.useState<WalletAvailability>({
    apple: false,
    google: false,
    checked: false,
  });
  const [googleLoading, setGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    async function checkAvailability() {
      const [appleRes, googleRes] = await Promise.allSettled([
        fetch(`/api/wallet/apple/${encodeURIComponent(clientId)}`, {
          method: "HEAD",
        }),
        fetch(`/api/wallet/google/${encodeURIComponent(clientId)}`, {
          method: "HEAD",
        }),
      ]);

      setAvailability({
        apple:
          appleRes.status === "fulfilled" && appleRes.value.status !== 503,
        google:
          googleRes.status === "fulfilled" && googleRes.value.status !== 503,
        checked: true,
      });
    }

    checkAvailability();
  }, [clientId]);

  const handleGoogleWallet = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch(
        `/api/wallet/google/${encodeURIComponent(clientId)}`,
      );
      if (!res.ok) {
        throw new Error("No se pudo generar el pase");
      }
      const data = await res.json();
      if (data.saveUrl) {
        window.open(data.saveUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Error al agregar a Google Wallet");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!availability.checked) return null;
  if (!availability.apple && !availability.google) return null;

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-[#9c6f04]">
        Agregar a tu billetera
      </p>

      <div className="flex flex-col gap-2">
        {availability.apple && (
          <a
            href={`/api/wallet/apple/${encodeURIComponent(clientId)}`}
            className="block"
          >
            <Button
              type="button"
              className="h-12 w-full rounded-[0.55rem] bg-black text-white hover:bg-black/90"
            >
              <AppleWalletIcon className="mr-2 h-5 w-5" />
              Agregar a Apple Wallet
            </Button>
          </a>
        )}

        {availability.google && (
          <Button
            type="button"
            onClick={handleGoogleWallet}
            disabled={googleLoading}
            className="h-12 w-full rounded-[0.55rem] bg-[#4285F4] text-white hover:bg-[#3367D6]"
          >
            {googleLoading ? (
              <SpinnerLabel label="Generando..." />
            ) : (
              <>
                <GoogleWalletIcon className="mr-2 h-5 w-5" />
                Agregar a Google Wallet
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function AppleWalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GoogleWalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3.5 8.5h3v7h-3zM8 6h3v12H8zM12.5 3h3v18h-3zM17 8.5h3v7h-3z" />
    </svg>
  );
}
