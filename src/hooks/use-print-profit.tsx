"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import {
  ProfitReportPrint,
  type ProfitReportPrintProps,
} from "@/components/print/profit-report-print";

export function usePrintProfit() {
  const printRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Reporte de utilidades",
  });

  const PrintContainer = (props: ProfitReportPrintProps) => (
    <div style={{ display: "none" }}>
      <ProfitReportPrint ref={printRef} {...props} />
    </div>
  );

  return { print, PrintContainer };
}
