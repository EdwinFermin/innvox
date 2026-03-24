"use client";

import * as React from "react";
import Image from "next/image";
import { Copy, Download, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

import { buildRegistrationLink, buildRegistrationQrUrl } from "@/lib/loyalty";
import { getAppBaseUrl } from "@/lib/link-payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const POSTER = {
  width: 900,
  height: 1200,
  logoSrc: "/brand/enviosrd-logo.png",
  title: "Programa de Fidelidad",
  subtitle: "Registrate ahora",
  instruction: "Escanea el codigo y registrate para acumular tokens con cada visita",
};

export function GenerateLoyaltyQrDialog() {
  const [open, setOpen] = React.useState(false);
  const [appOrigin, setAppOrigin] = React.useState(getAppBaseUrl());
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(getAppBaseUrl(window.location.origin));
    }
  }, []);

  const registrationLink = buildRegistrationLink(appOrigin);
  const qrCodeUrl = buildRegistrationQrUrl(appOrigin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      toast.success("Link de registro copiado");
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
    const { width, height } = POSTER;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la imagen");

    const [logoImg, qrImg] = await Promise.all([
      loadImage(POSTER.logoSrc),
      loadImage(qrCodeUrl),
    ]);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Header bar
    ctx.fillStyle = "#002c5a";
    ctx.fillRect(0, 0, width, 240);

    // Logo container
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 56, 48, 300, 132, 18);
    ctx.fill();
    ctx.drawImage(logoImg, 78, 60, 238, 106);

    // Accent bar
    ctx.fillStyle = "#e6a815";
    ctx.fillRect(0, 240, width, 14);

    // Subtitle
    ctx.textAlign = "center";
    ctx.fillStyle = "#8a6806";
    ctx.font = "700 28px Arial";
    ctx.fillText(POSTER.subtitle.toUpperCase(), width / 2, 340);

    // Title
    ctx.fillStyle = "#0d2d4f";
    ctx.font = "700 56px Arial";
    ctx.fillText(POSTER.title, width / 2, 415);

    // Info box
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d9e5db";
    ctx.lineWidth = 3;
    roundRect(ctx, 70, 470, width - 140, 120, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f6b46";
    ctx.font = "700 36px Arial";
    ctx.fillText("8 visitas = 1 recompensa", width / 2, 545);

    // QR container
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#dfe7dc";
    roundRect(ctx, 135, 640, width - 270, 300, 22);
    ctx.fill();
    ctx.stroke();
    ctx.drawImage(qrImg, width / 2 - 130, 660, 260, 260);

    // Instruction box
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#dce6db";
    roundRect(ctx, 70, 1000, width - 140, 90, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#556a63";
    ctx.font = "400 26px Arial";
    wrapText(ctx, POSTER.instruction, width / 2, 1052, width - 190, 32);

    // Link
    ctx.strokeStyle = "#d6ded4";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(70, 1125);
    ctx.lineTo(width - 70, 1125);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#8a9b95";
    ctx.font = "700 18px Arial";
    ctx.fillText("LINK DE REGISTRO", width / 2, 1158);

    ctx.fillStyle = "#5a6f67";
    ctx.font = "400 16px Arial";
    wrapText(ctx, registrationLink, width / 2, 1188, width - 160, 20);

    return canvas.toDataURL("image/png");
  }, [loadImage, qrCodeUrl, registrationLink]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const dataUrl = await buildPosterDataUrl();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "qr-programa-fidelidad.png";
      link.click();
      toast.success("Imagen descargada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      const dataUrl = await buildPosterDataUrl();
      const printWindow = window.open("", "_blank", "width=900,height=1200");
      if (!printWindow) throw new Error("No se pudo abrir la ventana de impresion");

      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>QR Programa de Fidelidad</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f5ef; }
              img { width: min(92vw, 420px); height: auto; display: block; }
              @page { margin: 10mm; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Programa de Fidelidad" />
          </body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => printWindow.print();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo imprimir");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-2xl sm:w-auto">
          <QrCode className="mr-2 h-4 w-4" />
          Generar QR
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog-content max-h-[90vh] max-w-lg w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="dashboard-dialog-header">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            QR de registro
          </DialogTitle>
          <DialogDescription className="max-w-md leading-6">
            Genera un poster con el QR del programa de fidelidad para colocar en la sucursal.
          </DialogDescription>
        </DialogHeader>

        <div className="dashboard-dialog-body">
          <div className="dashboard-form-card space-y-4">
            <div className="space-y-4 rounded-[1.2rem] border border-border/70 bg-slate-50/70 p-5 sm:p-6">
              <div className="flex justify-center">
                <Image
                  src={qrCodeUrl}
                  alt="QR de registro"
                  width={220}
                  height={220}
                  unoptimized
                  className="rounded-xl border bg-white p-2"
                />
              </div>

              <div className="dashboard-field">
                <label className="dashboard-field-label">Link de registro</label>
                <Input value={registrationLink} readOnly className="h-11 rounded-2xl border-border/70 bg-background" />
              </div>

              <div className="rounded-[1rem] border border-dashed border-border/70 bg-white/80 p-4 text-sm text-muted-foreground">
                Descarga una imagen lista para imprimir y colocar en la sucursal.
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-w-0 flex-col justify-center gap-1 rounded-2xl px-4 py-3 text-center whitespace-normal"
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-w-0 flex-col justify-center gap-1 rounded-2xl px-3 py-3 text-center text-xs leading-tight whitespace-normal"
                  disabled={isDownloading}
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Generando..." : "Descargar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-w-0 flex-col justify-center gap-1 rounded-2xl px-3 py-3 text-center text-xs leading-tight whitespace-normal"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
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
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (const [index, line] of lines.entries()) {
    ctx.fillText(line, x, startY + index * lineHeight);
  }
}
