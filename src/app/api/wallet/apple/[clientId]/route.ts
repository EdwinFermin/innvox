import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateApplePass, isAppleWalletConfigured } from "@/lib/wallet/apple";
import { getAppBaseUrl } from "@/lib/link-payments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    if (!isAppleWalletConfigured()) {
      return NextResponse.json(
        { message: "Apple Wallet no esta configurado." },
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
      return NextResponse.json(
        { message: "Error al generar el pase." },
        { status: 500 },
      );
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="enviosrd-fidelidad-${clientId}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Apple Wallet pass generation error:", error);
    return NextResponse.json(
      { message: "Error al generar el pase de Apple Wallet." },
      { status: 500 },
    );
  }
}
