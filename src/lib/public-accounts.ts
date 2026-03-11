import { getAppBaseUrl } from "./link-payments";

export function buildPublicAccountsLink(branchId: string, origin?: string) {
  const baseUrl = getAppBaseUrl(origin);
  return `${baseUrl}/accounts/${encodeURIComponent(branchId)}`;
}

export function buildAccountsQrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}
