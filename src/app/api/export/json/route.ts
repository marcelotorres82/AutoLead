import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoCompanies } from "@/lib/demo-data";
export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(
    {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      filters: { mode: "demo" },
      companies: demoCompanies,
      evidence: demoCompanies.flatMap((c) => c.sources),
      personas: [],
      history: [],
    },
    {
      headers: {
        "content-disposition": `attachment; filename="prospect-radar.json"`,
        "cache-control": "no-store",
      },
    },
  );
}
