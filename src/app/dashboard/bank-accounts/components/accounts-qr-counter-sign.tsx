"use client";

import * as React from "react";
import Image from "next/image";

type AccountsQrCounterSignProps = {
  branchName: string;
  qrCodeUrl: string;
  publicLink: string;
};

export const ACCOUNTS_SIGN_DIMENSIONS = {
  width: 900,
  height: 1200,
};

export const ACCOUNTS_SIGN_LOGO_SRC = "/brand/enviosrd-logo.png";

export const ACCOUNTS_SIGN_COPY = {
  title: "Escanea para ver nuestras cuentas",
  subtitle: "Cuentas bancarias",
  branchLabel: "Sucursal",
  instruction:
    "Escanea el codigo para ver las cuentas bancarias de esta sucursal",
};

export const AccountsQrCounterSign = React.forwardRef<
  HTMLDivElement,
  AccountsQrCounterSignProps
>(function AccountsQrCounterSign({ branchName, qrCodeUrl, publicLink }, ref) {
  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[0.8rem] border border-[#d8e1d6] bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,44,90,0.16)]"
    >
      <div className="bg-[#002c5a] px-5 py-5">
        <div className="rounded-[0.6rem] bg-white px-3 py-3 shadow-sm">
          <Image
            src={ACCOUNTS_SIGN_LOGO_SRC}
            alt="EnviosRD Courier"
            width={381}
            height={169}
            className="h-[42px] w-auto object-contain"
          />
        </div>
      </div>

      <div className="h-1.5 bg-[#e6a815]" />

      <div className="space-y-5 px-5 py-6">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6806]">
            {ACCOUNTS_SIGN_COPY.subtitle}
          </p>
          <h3 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-[#0d2d4f]">
            {ACCOUNTS_SIGN_COPY.title}
          </h3>
        </div>

        <div className="rounded-[0.7rem] border border-[#d9e5db] bg-white px-4 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6f847c]">
            {ACCOUNTS_SIGN_COPY.branchLabel}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0f6b46]">
            {branchName}
          </p>
        </div>

        <div className="rounded-[0.7rem] border border-[#dfe7dc] bg-white px-4 py-4">
          <div className="flex justify-center">
            <Image
              src={qrCodeUrl}
              alt={`QR de ${branchName}`}
              width={220}
              height={220}
              unoptimized
              className="rounded-[0.4rem] border border-[#d7e0d6] bg-white p-2"
            />
          </div>
        </div>

        <div className="rounded-[0.7rem] border border-[#dce6db] bg-white px-4 py-4 text-center text-sm leading-6 text-[#556a63]">
          {ACCOUNTS_SIGN_COPY.instruction}
        </div>

        <div className="border-t border-dashed border-[#d6ded4] pt-4 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#8a9b95]">
            Link publico
          </p>
          <p className="mt-2 break-all text-xs leading-5 text-[#5a6f67]">
            {publicLink}
          </p>
        </div>
      </div>
    </div>
  );
});
