import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";

import "@/app/globals.css";
import { ClientRoot } from "@/app/client-root";

const appName = "Innvox";
const appDescription =
  "Innvox helps you manage invoices, clients, branches, and financial operations from a single dashboard.";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: appName,
  title: {
    default: `${appName} | Invoice and Operations Dashboard`,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  keywords: [
    "invoices",
    "billing",
    "clients",
    "accounts receivable",
    "accounts payable",
    "financial dashboard",
  ],
  authors: [{ name: appName }],
  creator: appName,
  publisher: appName,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_DO",
    url: "/",
    siteName: appName,
    title: `${appName} | Invoice and Operations Dashboard`,
    description: appDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Innvox dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} | Invoice and Operations Dashboard`,
    description: appDescription,
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
