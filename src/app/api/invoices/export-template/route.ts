import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const templatePath = path.join(process.cwd(), "export.xlsx");
    const file = await readFile(templatePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="export.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo cargar la plantilla de exportacion." },
      { status: 500 },
    );
  }
}
