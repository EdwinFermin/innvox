import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f8fafc",
          padding: "64px",
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-120px",
            top: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "999px",
            background: "radial-gradient(circle, #14b8a6 0%, transparent 70%)",
            opacity: 0.35,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-160px",
            bottom: "-120px",
            width: "520px",
            height: "520px",
            borderRadius: "999px",
            background: "radial-gradient(circle, #22c55e 0%, transparent 72%)",
            opacity: 0.3,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #22c55e, #14b8a6)",
              }}
            />
            Innvox
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05 }}>
              Invoice and
              <br />
              Operations Dashboard
            </div>
            <div style={{ fontSize: 30, opacity: 0.9 }}>
              Manage invoices, clients, branches, and finances in one place.
            </div>
          </div>

          <div style={{ fontSize: 24, opacity: 0.9 }}>innvox.app</div>
        </div>
      </div>
    ),
    size,
  );
}
