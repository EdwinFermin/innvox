import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateGoogleWalletUrl,
  isGoogleWalletConfigured,
} from "@/lib/wallet/google";
import { getAppBaseUrl } from "@/lib/link-payments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    if (!isGoogleWalletConfigured()) {
      return NextResponse.json(
        { message: "Google Wallet no esta configurado." },
        { status: 503 },
      );
    }

    const { clientId } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();

    if (error || !client) {
      return NextResponse.json(
        { message: "Cliente no encontrado." },
        { status: 404 },
      );
    }

    const origin = new URL(request.url).origin;
    const logoUrl = `${getAppBaseUrl(origin)}/brand/enviosrd-logo.png`;

    const saveUrl = generateGoogleWalletUrl(
      {
        id: client.id,
        name: client.name,
        phone: client.phone,
        tokens: client.tokens,
      },
      logoUrl,
    );

    if (!saveUrl) {
      return NextResponse.json(
        { message: "Error al generar el pase." },
        { status: 500 },
      );
    }

    return NextResponse.json({ saveUrl });
  } catch (error) {
    console.error("Google Wallet pass generation error:", error);
    return NextResponse.json(
      { message: "Error al generar el pase de Google Wallet." },
      { status: 500 },
    );
  }
}
