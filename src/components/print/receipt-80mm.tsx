"use client";

import { Invoice } from "@/types/invoice.types";
import { forwardRef } from "react";

export const Receipt80mm = forwardRef<HTMLDivElement, { invoice: Invoice }>(
  ({ invoice }, ref) => {
    const total = invoice.amount + invoice.ITBIS;

    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          padding: "10px",
          paddingTop: "10%",
          paddingBottom: "10%",
          fontFamily: "monospace",
          fontSize: "12px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0 }}>COENMA SRL</h2>
          <p style={{ margin: "4px 0" }}>COMPROBANTE AUTORIZADO POR LA DGII</p>
          <hr />
        </div>
        <br />
        <div>
          <p>
            <b>Fecha:</b> {invoice.createdAt.toDate().toLocaleString()}
          </p>
          <p>
            <b>Factura #:</b> {invoice.id}
          </p>
          <p>
            <b>Cliente:</b> {invoice.client?.name} {invoice.client?.poBox}
          </p>
          <p>
            <b>NCF:</b> {invoice.NCF}
          </p>
        </div>
        <br />
        <hr />
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "4px 0" }}>FACTURA CON VALOR FISCAL</p>
        </div>
        <hr />
        <div style={{ marginTop: "8px" }}>
          <p style={{ margin: "0 0 4px 0" }}>
            <b>Descripción:</b>
          </p>
          <p style={{ margin: 0 }}>{invoice.description}</p>
        </div>
        <hr />
        <div style={{ textAlign: "right" }}>
          <p>
            <b>Monto:</b> {invoice.amount.toFixed(2)}
          </p>
          <p>
            <b>Monto Exento:</b> {invoice.montoExento.toFixed(2)}
          </p>
          <p>
            <b>Monto Gravado:</b> {invoice.montoGravado.toFixed(2)}
          </p>
          <p>
            <b>ITBIS:</b> {invoice.ITBIS.toFixed(2)}
          </p>
          <p>
            <b>Total:</b> {total.toFixed(2)}
          </p>
        </div>
        <hr />
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <p>Gracias por preferirnos!</p>
        </div>
      </div>
    );
  }
);

Receipt80mm.displayName = "Receipt80mm";
