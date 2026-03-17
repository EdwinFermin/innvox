"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import {
  BankAccountDetailPrint,
  type BankAccountDetailPrintProps,
} from "@/components/print/bank-account-detail-print";

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

    @page {
      size: A4 portrait;
      margin: 10mm;
    }
  }
`;

export function usePrintBankAccountDetail() {
  const printRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Detalle de cuenta",
    preserveAfterPrint: true,
    pageStyle: PRINT_PAGE_STYLE,
    onBeforePrint: () => new Promise((resolve) => setTimeout(resolve, 100)),
  });

  const PrintContainer = (props: BankAccountDetailPrintProps) => (
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
      <BankAccountDetailPrint ref={printRef} {...props} />
    </div>
  );

  return { print, PrintContainer };
}
