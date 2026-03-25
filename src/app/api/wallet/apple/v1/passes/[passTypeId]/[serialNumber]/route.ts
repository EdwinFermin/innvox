import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateApplePass,
  generateAuthToken,
  clientIdFromSerial,
  isAppleWalletConfigured,
} from "@/lib/wallet/apple";
import { getAppBaseUrl } from "@/lib/link-payments";

type Params = {
  passTypeId: string;
  serialNumber: string;
};

/** GET: Deliver the latest version of a pass */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { serialNumber } = await params;

  // Verify auth token
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("ApplePass ")) {
    return new NextResponse(null, { status: 401 });
  }

  const clientId = clientIdFromSerial(serialNumber);
  const expectedToken = generateAuthToken(clientId);
  const providedToken = auth.slice("ApplePass ".length);

  if (providedToken !== expectedToken) {
    return new NextResponse(null, { status: 401 });
  }

  if (!isAppleWalletConfigured()) {
    return new NextResponse(null, { status: 500 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (error || !client) {
    return new NextResponse(null, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const baseUrl = getAppBaseUrl(origin);

  const buffer = await generateApplePass(
    {
      id: client.id,
      name: client.name,
      phone: client.phone,
      tokens: client.tokens,
    },
    baseUrl,
  );

  if (!buffer) {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": new Date().toUTCString(),
    },
  });
}
