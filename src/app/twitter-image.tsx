import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #111827 0%, #0f172a 50%, #1f2937 100%)",
          color: "#f9fafb",
          padding: "56px",
          fontFamily: "Segoe UI, sans-serif",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.95 }}>Innvox</div>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>
            Smart Invoicing
            <br />
            and Operations
          </div>
          <div style={{ fontSize: 30, opacity: 0.9 }}>
            Clients, branches, payables, receivables, and reports.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
