"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import {
  DailyCloseReportPrint,
  type DailyCloseReportPrintProps,
} from "@/components/print/daily-close-report-print";

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

export function usePrintDailyClose() {
  const printRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Cuadre del dia",
    preserveAfterPrint: true,
    pageStyle: PRINT_PAGE_STYLE,
    onBeforePrint: () => new Promise((resolve) => setTimeout(resolve, 100)),
  });

  const PrintContainer = (props: DailyCloseReportPrintProps) => (
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
      <DailyCloseReportPrint ref={printRef} {...props} />
    </div>
  );

  return { print, PrintContainer };
}
