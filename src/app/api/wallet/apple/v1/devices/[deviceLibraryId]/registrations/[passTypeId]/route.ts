import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Params = {
  deviceLibraryId: string;
  passTypeId: string;
};

/** GET: Get serial numbers for passes registered to a device */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const { deviceLibraryId, passTypeId } = await params;
  const url = new URL(request.url);
  const passesUpdatedSince = url.searchParams.get("passesUpdatedSince");

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("apple_wallet_devices")
    .select("serial_number, updated_at")
    .eq("device_library_id", deviceLibraryId)
    .eq("pass_type_id", passTypeId)
    .gt("updated_at", passesUpdatedSince ?? "1970-01-01T00:00:00Z");

  if (error || !data || data.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const lastUpdated = data.reduce((max, d) =>
    d.updated_at > max ? d.updated_at : max, data[0].updated_at);

  return NextResponse.json({
    serialNumbers: data.map((d) => d.serial_number),
    lastUpdated,
  });
}
