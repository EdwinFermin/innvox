import { buildQrCodeUrl, getAppBaseUrl } from "@/lib/link-payments";

export function buildRegistrationLink(origin?: string) {
  const baseUrl = getAppBaseUrl(origin);
  return `${baseUrl}/loyalty/register`;
}

export function buildRegistrationQrUrl(origin?: string) {
  return buildQrCodeUrl(buildRegistrationLink(origin));
}

export function buildClientQrUrl(clientId: string) {
  return buildQrCodeUrl(clientId);
}
