"use client";

import { Receipt80mm } from "@/components/print/receipt-80mm";
import { Invoice } from "@/types/invoice.types";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

export function usePrintInvoice() {
  const printRef = useRef(null);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Invoice",
  });

  const PrintContainer = ({ invoice }: { invoice: Invoice }) => (
    <div style={{ display: "none" }}>
      <Receipt80mm ref={printRef} invoice={invoice} />
    </div>
  );

  return { print, PrintContainer };
}
