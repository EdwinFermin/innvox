export function getAppBaseUrl(origin?: string) {
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return (origin || fallback).replace(/\/$/, "");
}

export function buildPublicPaymentLink(branchId: string, origin?: string) {
  const baseUrl = getAppBaseUrl(origin);
  return `${baseUrl}/pay/${encodeURIComponent(branchId)}`;
}

export function buildQrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}
