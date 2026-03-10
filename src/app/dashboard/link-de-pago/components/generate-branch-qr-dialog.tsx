"use client";

import * as React from "react";
import Image from "next/image";
import { Download, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Branch } from "@/types/branch.types";
import {
  buildPublicPaymentLink,
  buildQrCodeUrl,
  getAppBaseUrl,
} from "@/lib/link-payments";
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
  BranchQrCounterSign,
  COUNTER_SIGN_COPY,
  COUNTER_SIGN_DIMENSIONS,
  COUNTER_SIGN_LOGO_SRC,
} from "./branch-qr-counter-sign";

type GenerateBranchQrDialogProps = {
  branches: Branch[];
};

export function GenerateBranchQrDialog({ branches }: GenerateBranchQrDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [branchId, setBranchId] = React.useState("");
  const [appOrigin, setAppOrigin] = React.useState(getAppBaseUrl());
  const [isDownloading, setIsDownloading] = React.useState(false);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(getAppBaseUrl(window.location.origin));
    }
  }, []);

  const publicLink = branchId ? buildPublicPaymentLink(branchId, appOrigin) : "";
  const qrCodeUrl = publicLink ? buildQrCodeUrl(publicLink) : "";
  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const branchName = selectedBranch?.name ?? branchId;

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
      image.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
      image.src = src;
    });
  }, []);

  const buildPosterDataUrl = React.useCallback(async () => {
    if (!publicLink || !branchName) {
      throw new Error("Selecciona una sucursal primero");
    }

    const { width, height } = COUNTER_SIGN_DIMENSIONS;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo preparar la imagen");
    }

    const [logoImage, qrImage] = await Promise.all([
      loadImage(COUNTER_SIGN_LOGO_SRC),
      loadImage(qrCodeUrl),
    ]);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#002c5a";
    context.fillRect(0, 0, width, 240);

    context.fillStyle = "#ffffff";
    roundRect(context, 56, 48, 300, 132, 18);
    context.fill();
    context.drawImage(logoImage, 78, 60, 238, 106);

    context.fillStyle = "#e6a815";
    context.fillRect(0, 240, width, 14);

    context.textAlign = "center";
    context.fillStyle = "#8a6806";
    context.font = "700 28px Arial";
    context.fillText(COUNTER_SIGN_COPY.subtitle.toUpperCase(), width / 2, 340);

    context.fillStyle = "#0d2d4f";
    context.font = "700 64px Arial";
    context.fillText(COUNTER_SIGN_COPY.title, width / 2, 415);

    context.fillStyle = "#ffffff";
    context.strokeStyle = "#d9e5db";
    context.lineWidth = 3;
    roundRect(context, 70, 470, width - 140, 150, 22);
    context.fill();
    context.stroke();

    context.fillStyle = "#6f847c";
    context.font = "700 26px Arial";
    context.fillText(COUNTER_SIGN_COPY.branchLabel.toUpperCase(), width / 2, 525);

    context.fillStyle = "#0f6b46";
    context.font = "700 48px Arial";
    wrapText(context, branchName, width / 2, 580, width - 220, 54);

    context.fillStyle = "#ffffff";
    context.strokeStyle = "#dfe7dc";
    roundRect(context, 135, 670, width - 270, 300, 22);
    context.fill();
    context.stroke();

    context.drawImage(qrImage, width / 2 - 130, 690, 260, 260);

    context.fillStyle = "#ffffff";
    context.strokeStyle = "#dce6db";
    roundRect(context, 70, 1030, width - 140, 90, 18);
    context.fill();
    context.stroke();

    context.fillStyle = "#556a63";
    context.font = "400 28px Arial";
    wrapText(context, COUNTER_SIGN_COPY.instruction, width / 2, 1082, width - 190, 34);

    context.strokeStyle = "#d6ded4";
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(70, 1155);
    context.lineTo(width - 70, 1155);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#8a9b95";
    context.font = "700 18px Arial";
    context.fillText("LINK PUBLICO", width / 2, 1188);

    context.fillStyle = "#5a6f67";
    context.font = "400 16px Arial";
    wrapText(context, publicLink, width / 2, 1218, width - 160, 20);

    return canvas.toDataURL("image/png");
  }, [branchName, loadImage, publicLink, qrCodeUrl]);

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      const dataUrl = await buildPosterDataUrl();
      const link = document.createElement("a");
      const safeBranchName = (branchName || "sucursal")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      link.href = dataUrl;
      link.download = `qr-link-de-pago-${safeBranchName || "sucursal"}.png`;
      link.click();
      toast.success("Imagen descargada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la imagen");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      const dataUrl = await buildPosterDataUrl();
      const printWindow = window.open("", "_blank", "width=900,height=1200");

      if (!printWindow) {
        throw new Error("No se pudo abrir la ventana de impresion");
      }

      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>QR Link de pago</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f5ef; }
              img { width: min(92vw, 420px); height: auto; display: block; }
              @page { margin: 10mm; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Link de pago" />
          </body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo imprimir la imagen");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full"
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
          <DialogTitle className="font-bold text-2xl">QR por sucursal</DialogTitle>
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
                Descarga una imagen lista para imprimir y colocar en la sucursal.
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Button type="button" variant="outline" className="px-4" onClick={handleCopy}>
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
                  onClick={() => window.open(publicLink, "_blank", "noopener,noreferrer")}
                >
                  Abrir pagina
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Selecciona una sucursal para generar su QR y copiar el link publico.
            </div>
          )}
        </div>
      </DialogContent>

      {publicLink && qrCodeUrl ? (
        <div className="sr-only" aria-hidden="true">
          <BranchQrCounterSign
            branchName={branchName}
            qrCodeUrl={qrCodeUrl}
            publicLink={publicLink}
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
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
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
