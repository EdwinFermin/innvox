import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateAuthToken } from "@/lib/wallet/apple";

type Params = {
  deviceLibraryId: string;
  passTypeId: string;
  serialNumber: string;
};

function verifyAuth(request: Request, serialNumber: string): boolean {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("ApplePass ")) return false;
  const token = auth.slice("ApplePass ".length);
  const clientId = serialNumber.replace(/^loyalty-/, "");
  return token === generateAuthToken(clientId);
}

/** POST: Register a device for push notifications */
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { deviceLibraryId, passTypeId, serialNumber } = await params;

  if (!verifyAuth(request, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const body = await request.json();
    const pushToken = body.pushToken;

    if (!pushToken) {
      return new NextResponse(null, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    const { error } = await (supabase
      .from("apple_wallet_devices" as any)
      .upsert(
        {
          device_library_id: deviceLibraryId,
          push_token: pushToken,
          pass_type_id: passTypeId,
          serial_number: serialNumber,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "device_library_id,pass_type_id,serial_number" },
      ) as any);

    if (error) {
      console.error("Apple Wallet device registration error:", error);
      return new NextResponse(null, { status: 500 });
    }

    // 201 = newly registered, 200 = already registered (updated)
    return new NextResponse(null, { status: 201 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

/** DELETE: Unregister a device */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { deviceLibraryId, passTypeId, serialNumber } = await params;

  if (!verifyAuth(request, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  await (supabase
    .from("apple_wallet_devices" as any)
    .delete()
    .eq("device_library_id", deviceLibraryId)
    .eq("pass_type_id", passTypeId)
    .eq("serial_number", serialNumber) as any);

  return new NextResponse(null, { status: 200 });
}
