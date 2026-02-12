"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import {
  ProfitReportPrint,
  type ProfitReportPrintProps,
} from "@/components/print/profit-report-print";

const PRINT_PAGE_STYLE = `
  @media print {
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export function usePrintProfit() {
  const printRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Reporte de utilidades",
    preserveAfterPrint: true,
    pageStyle: PRINT_PAGE_STYLE,
    onBeforePrint: () =>
      new Promise((resolve) => setTimeout(resolve, 100)),
  });

  const PrintContainer = (props: ProfitReportPrintProps) => (
    <div
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "210mm",
        visibility: "hidden",
      }}
      aria-hidden="true"
    >
      <ProfitReportPrint ref={printRef} {...props} />
    </div>
  );

  return { print, PrintContainer };
}
