"use client";

import * as React from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSpanishMonthName, parseInvoicePdf } from "@/utils/invoice-pdf-export";

const DGII_HEADERS = [
  "RNC o Cédula",
  "Tipo Id",
  "Tipo Bienes y Servicios Comprados",
  "NCF",
  "NCF ó Documento Modificado",
  "Fecha Comprobante",
  "",
  "Fecha Pago",
  "",
  "Monto Facturado en Servicios",
  "Monto Facturado en Bienes",
  "Total Monto Facturado",
  "ITBIS Facturado",
  "ITBIS Retenido",
  "ITBIS sujeto a Proporcionalidad (Art. 349)",
  "ITBIS llevado al Costo",
  "ITBIS por Adelantar",
  "ITBIS percibido en compras",
  "Tipo de Retención en ISR",
  "Monto Retención Renta",
  "ISR Percibido en compras",
  "Impuesto Selectivo al Consumo",
  "Otros Impuesto/Tasas",
  "Monto Propina Legal",
  "Total Monto Factura",
] as const;

export default function DgiiFormPage() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [processedCount, setProcessedCount] = React.useState(0);
  const [skippedFiles, setSkippedFiles] = React.useState<string[]>([]);
  const [parsedInvoices, setParsedInvoices] = React.useState<
    Awaited<ReturnType<typeof parseInvoicePdf>>[]
  >([]);
  const pdfInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleOpenPdfPicker = React.useCallback(() => {
    pdfInputRef.current?.click();
  }, []);

  const handlePdfAnalysis = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (!files.length) {
        return;
      }

      setIsAnalyzing(true);
      setProcessedCount(0);
      setSkippedFiles([]);
      setParsedInvoices([]);

      try {
        const analyzedInvoices: Awaited<ReturnType<typeof parseInvoicePdf>>[] = [];
        const skipped: string[] = [];

        for (const file of files) {
          try {
            const parsedInvoice = await parseInvoicePdf(file);
            analyzedInvoices.push(parsedInvoice);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "No se pudo leer el PDF.";
            skipped.push(`${file.name}: ${message}`);
          }
        }

        if (!analyzedInvoices.length) {
          setSkippedFiles(skipped);
          toast.error("No se pudo extraer informacion de los PDFs seleccionados.");
          return;
        }

        setParsedInvoices(analyzedInvoices);
        setProcessedCount(analyzedInvoices.length);
        setSkippedFiles(skipped);

        if (skipped.length) {
          toast.success(`Analizadas ${analyzedInvoices.length} facturas. ${skipped.length} archivo(s) omitido(s).`);
          return;
        }

        toast.success(`Analizadas ${analyzedInvoices.length} facturas correctamente.`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron analizar los PDFs seleccionados.";
        toast.error(message);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [],
  );

  const handleExport = React.useCallback(async (): Promise<void> => {
    if (!parsedInvoices.length) {
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Formulario DGII");

      sheet.getCell("A1").value = "MES";
      sheet.getCell("D1").value = getSpanishMonthName(parsedInvoices[0].date);

      const headerRow = sheet.getRow(3);
      DGII_HEADERS.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4B7D19" },
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      headerRow.height = 42;

      parsedInvoices.forEach((invoice, rowIndex) => {
        const row = sheet.getRow(4 + rowIndex);
        row.getCell(1).value = invoice.rnc;
        row.getCell(4).value = invoice.ncf;
        row.getCell(6).value = invoice.date;
        row.getCell(6).numFmt = "dd/mm/yyyy";
        row.getCell(10).value = invoice.subtotal;
        row.getCell(13).value = invoice.itbis;
        row.getCell(25).value = invoice.total;
      });

      [10, 13, 25].forEach((columnNumber) => {
        sheet.getColumn(columnNumber).numFmt = "#,##0.00";
      });

      const output = await workbook.xlsx.writeBuffer();

      const blob = new Blob([output], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `export-facturas-${Date.now()}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);

      if (skippedFiles.length > 0) {
        toast.success(
          `Exportadas ${parsedInvoices.length} facturas. ${skippedFiles.length} archivo(s) omitido(s).`,
        );
        return;
      }

      toast.success(`Exportadas ${parsedInvoices.length} facturas correctamente.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el archivo de exportacion.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [parsedInvoices, skippedFiles]);

  return (
    <div className="w-full space-y-4">
      <div>
        <h3 className="text-base font-semibold md:text-lg 2xl:text-2xl">
          Formulario DGII
        </h3>
        <p className="text-sm text-muted-foreground">
          Carga multiples facturas en PDF y genera el archivo Excel con formato
          DGII usando la plantilla del sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportar desde PDFs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleOpenPdfPicker} disabled={isAnalyzing || isExporting}>
              {isAnalyzing ? "Analizando facturas..." : "Cargar facturas"}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isAnalyzing || isExporting || parsedInvoices.length === 0}
              variant="outline"
            >
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
            <input
              ref={pdfInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handlePdfAnalysis}
            />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>Procesadas: {processedCount}</p>
            <p>Omitidas: {skippedFiles.length}</p>
          </div>

          {skippedFiles.length > 0 ? (
            <div className="rounded-md border border-destructive/30 p-3">
              <p className="text-sm font-medium text-destructive mb-2">
                Archivos omitidos
              </p>
              <ul className="space-y-1 text-sm">
                {skippedFiles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
