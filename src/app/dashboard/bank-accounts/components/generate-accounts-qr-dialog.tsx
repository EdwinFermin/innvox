"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Branch } from "@/types/branch.types";
import {
  buildPublicAccountsLink,
  buildAccountsQrCodeUrl,
  fetchPublicBranchAccounts,
  type PublicBankAccount,
} from "@/lib/public-accounts";
import { getAppBaseUrl } from "@/lib/link-payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTitle } from "@radix-ui/react-dialog";

import {
  AccountsQrCounterSign,
  ACCOUNTS_SIGN_COPY,
  ACCOUNTS_SIGN_DIMENSIONS,
  ACCOUNTS_SIGN_LOGO_SRC,
} from "./accounts-qr-counter-sign";

type GenerateAccountsQrDialogProps = {
  branches: Branch[];
};

export function GenerateAccountsQrDialog({
  branches,
}: GenerateAccountsQrDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [branchId, setBranchId] = React.useState("");
  const [appOrigin, setAppOrigin] = React.useState(getAppBaseUrl());
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(getAppBaseUrl(window.location.origin));
    }
  }, []);

  const publicLink = branchId
    ? buildPublicAccountsLink(branchId, appOrigin)
    : "";
  const qrCodeUrl = publicLink ? buildAccountsQrCodeUrl(publicLink) : "";
  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const branchName = selectedBranch?.name ?? branchId;
  const publicAccountsQuery = useQuery({
    queryKey: ["public-branch-accounts", branchId],
    queryFn: () => fetchPublicBranchAccounts(branchId),
    enabled: !!branchId,
  });
  const publicAccounts = React.useMemo(
    () => publicAccountsQuery.data ?? [],
    [publicAccountsQuery.data],
  );

  const printableAccounts = React.useMemo<PublicBankAccount[]>(
    () => publicAccounts.slice(0, 4),
    [publicAccounts],
  );

  const handleCopy = async () => {
    if (!publicLink) {
      toast.error("Selecciona una sucursal primero");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success("Link publico copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const loadImage = React.useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`No se pudo cargar la imagen: ${src}`));
      image.src = src;
    });
  }, []);

  const buildPosterDataUrl = React.useCallback(async () => {
    if (!publicLink || !branchName) {
      throw new Error("Selecciona una sucursal primero");
    }

    const { width, height } = ACCOUNTS_SIGN_DIMENSIONS;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo preparar la imagen");
    }

    const [logoImage, qrImage] = await Promise.all([
      loadImage(ACCOUNTS_SIGN_LOGO_SRC),
      loadImage(qrCodeUrl),
    ]);

    // White background
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    // Navy header
    context.fillStyle = "#002c5a";
    context.fillRect(0, 0, width, 240);

    // Logo container
    context.fillStyle = "#ffffff";
    roundRect(context, 56, 48, 300, 132, 18);
    context.fill();
    context.drawImage(logoImage, 78, 60, 238, 106);

    // Gold accent bar
    context.fillStyle = "#e6a815";
    context.fillRect(0, 240, width, 14);

    // Subtitle
    context.textAlign = "center";
    context.fillStyle = "#8a6806";
    context.font = "700 28px Arial";
    context.fillText(
      ACCOUNTS_SIGN_COPY.subtitle.toUpperCase(),
      width / 2,
      340,
    );

    // Title (smaller font to fit longer text)
    context.fillStyle = "#0d2d4f";
    context.font = "700 48px Arial";
    wrapText(
      context,
      ACCOUNTS_SIGN_COPY.title,
      width / 2,
      415,
      width - 140,
      56,
    );

    // Branch label box
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#d9e5db";
    context.lineWidth = 3;
    roundRect(context, 70, 470, width - 140, 150, 22);
    context.fill();
    context.stroke();

    context.fillStyle = "#6f847c";
    context.font = "700 26px Arial";
    context.fillText(
      ACCOUNTS_SIGN_COPY.branchLabel.toUpperCase(),
      width / 2,
      525,
    );

    context.fillStyle = "#0f6b46";
    context.font = "700 48px Arial";
    wrapText(context, branchName, width / 2, 580, width - 220, 54);

    // QR code container
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#dfe7dc";
    roundRect(context, 135, 670, width - 270, 300, 22);
    context.fill();
    context.stroke();

    context.drawImage(qrImage, width / 2 - 130, 690, 260, 260);

    // Instruction box
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#dce6db";
    roundRect(context, 70, 1030, width - 140, 90, 18);
    context.fill();
    context.stroke();

    context.fillStyle = "#556a63";
    context.font = "400 28px Arial";
    wrapText(
      context,
      ACCOUNTS_SIGN_COPY.instruction,
      width / 2,
      1082,
      width - 190,
      34,
    );

    // Accounts list panel
    context.fillStyle = "#f8fbf7";
    context.strokeStyle = "#dce6db";
    roundRect(context, 70, 1168, width - 140, 210, 18);
    context.fill();
    context.stroke();

    context.fillStyle = "#8a9b95";
    context.font = "700 18px Arial";
    context.fillText("CUENTAS DISPONIBLES", width / 2, 1200);

    if (printableAccounts.length > 0) {
      printableAccounts.forEach((account, index) => {
        const rowY = 1224 + index * 38;

        context.fillStyle = "#ffffff";
        context.strokeStyle = "#d9e5db";
        roundRect(context, 105, rowY, width - 210, 30, 12);
        context.fill();
        context.stroke();

        context.textAlign = "left";
        context.fillStyle = "#0d2d4f";
        context.font = "700 16px Arial";
        const bankLabel = account.bank_name || account.account_name;
        context.fillText(bankLabel, 126, rowY + 20);

        context.fillStyle = "#556a63";
        context.font = "400 14px Arial";
        const accountLabel = account.account_number || "Numero no disponible";
        context.fillText(accountLabel, 430, rowY + 20);

        context.textAlign = "right";
        context.fillStyle = "#0f6b46";
        context.font = "700 14px Arial";
        context.fillText(account.currency, width - 126, rowY + 20);
      });

      if (publicAccounts.length > printableAccounts.length) {
        context.textAlign = "center";
        context.fillStyle = "#556a63";
        context.font = "400 14px Arial";
        context.fillText(
          `y ${publicAccounts.length - printableAccounts.length} cuenta${publicAccounts.length - printableAccounts.length === 1 ? "" : "s"} mas en el enlace`,
          width / 2,
          1370,
        );
      }
    } else {
      context.textAlign = "center";
      context.fillStyle = "#556a63";
      context.font = "400 16px Arial";
      context.fillText(
        "No hay cuentas publicas disponibles en este momento",
        width / 2,
        1288,
      );
    }

    // Dashed separator
    context.strokeStyle = "#d6ded4";
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(70, 1408);
    context.lineTo(width - 70, 1408);
    context.stroke();
    context.setLineDash([]);

    // Public link label
    context.fillStyle = "#8a9b95";
    context.font = "700 18px Arial";
    context.textAlign = "center";
    context.fillText("LINK PUBLICO", width / 2, 1438);

    // Public link URL
    context.fillStyle = "#5a6f67";
    context.font = "400 16px Arial";
    wrapText(context, publicLink, width / 2, 1464, width - 160, 20);

    return canvas.toDataURL("image/png");
  }, [branchName, loadImage, printableAccounts, publicAccounts.length, publicLink, qrCodeUrl]);

  const handleDownloadImage = async () => {
    try {
      if (publicAccountsQuery.isFetching) {
        toast.error("Espera a que carguen las cuentas de la sucursal");
        return;
      }

      setIsDownloading(true);
      const dataUrl = await buildPosterDataUrl();
      const link = document.createElement("a");
      const safeBranchName = (branchName || "sucursal")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      link.href = dataUrl;
      link.download = `qr-cuentas-bancarias-${safeBranchName || "sucursal"}.png`;
      link.click();
      toast.success("Imagen descargada");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo descargar la imagen",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      if (publicAccountsQuery.isFetching) {
        toast.error("Espera a que carguen las cuentas de la sucursal");
        return;
      }

      const dataUrl = await buildPosterDataUrl();
      const printWindow = window.open("", "_blank", "width=900,height=1200");

      if (!printWindow) {
        throw new Error("No se pudo abrir la ventana de impresion");
      }

      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>QR Cuentas bancarias</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f5ef; }
              img { width: min(92vw, 420px); height: auto; display: block; }
              @page { margin: 10mm; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Cuentas bancarias" />
          </body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo imprimir la imagen",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            setBranchId("");
            setOpen(true);
          }}
        >
          <QrCode className="mr-2 h-4 w-4" />
          Generar QR
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] overflow-x-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            QR Cuentas por sucursal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sucursal</label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {publicLink ? (
            <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
              <div className="flex justify-center">
                <Image
                  src={qrCodeUrl}
                  alt={`QR de ${branchId}`}
                  width={220}
                  height={220}
                  unoptimized
                  className="rounded-xl border bg-white p-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Link publico</label>
                <Input value={publicLink} readOnly />
              </div>

              <div className="rounded-[0.7rem] border border-dashed border-[#d7dfd1] bg-white/80 p-4 text-sm text-muted-foreground">
                Descarga una imagen lista para imprimir y colocar en la
                sucursal. Los clientes podran escanear el QR para ver las
                cuentas bancarias disponibles.
              </div>

              <div className="rounded-[0.7rem] border border-[#dce6db] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Cuentas en el afiche
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {publicAccountsQuery.isLoading
                        ? "Cargando cuentas..."
                        : publicAccounts.length > 0
                          ? `${Math.min(publicAccounts.length, 4)} de ${publicAccounts.length} cuentas visibles`
                          : "Sin cuentas publicas"}
                    </p>
                  </div>
                  {publicAccounts.length > 0 ? (
                    <span className="rounded-full border border-[#d9e5db] bg-[#f2f7f0] px-2.5 py-0.5 text-xs font-semibold text-[#0f6b46]">
                      {publicAccounts.length} total
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {publicAccountsQuery.isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-12 rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : printableAccounts.length > 0 ? (
                    printableAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="rounded-lg border border-[#d9e5db] bg-[#f8fbf7] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-[#0d2d4f]">
                            {account.bank_name || account.account_name}
                          </p>
                          <span className="shrink-0 text-xs font-semibold text-[#0f6b46]">
                            {account.currency}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {account.account_name}
                        </p>
                        <p className="mt-1 font-mono text-sm text-[#0d2d4f]">
                          {account.account_number || "Numero no disponible"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#d9e5db] px-3 py-4 text-sm text-muted-foreground">
                      Esta sucursal no tiene cuentas publicas disponibles para mostrar en el afiche.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Button
                  type="button"
                  variant="outline"
                  className="px-4"
                  onClick={handleCopy}
                >
                  Copiar link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-4 justify-center gap-2"
                  disabled={isDownloading}
                  onClick={handleDownloadImage}
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Generando..." : "Descargar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-4 justify-center gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  className="px-4"
                  onClick={() =>
                    window.open(publicLink, "_blank", "noopener,noreferrer")
                  }
                >
                  Abrir pagina
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Selecciona una sucursal para generar su QR y copiar el link
              publico.
            </div>
          )}
        </div>
      </DialogContent>

      {publicLink && qrCodeUrl ? (
        <div className="sr-only" aria-hidden="true">
          <AccountsQrCounterSign
            branchName={branchName}
            qrCodeUrl={qrCodeUrl}
            publicLink={publicLink}
            accounts={printableAccounts}
          />
        </div>
      ) : null}
    </Dialog>
  );
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (const [index, line] of lines.entries()) {
    context.fillText(line, x, startY + index * lineHeight);
  }
}
