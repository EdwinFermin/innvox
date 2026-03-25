import { NextResponse } from "next/server";

/** POST: Log errors from Apple Wallet */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Apple Wallet log:", JSON.stringify(body));
  } catch {
    // ignore
  }
  return new NextResponse(null, { status: 200 });
}
