import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { demoMode } from "@/lib/env";
export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const companyList = demoMode ? demoCompanies : await listCompanies();
  return NextResponse.json(
    {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      filters: { mode: demoMode ? "demo" : "real" },
      companies: companyList,
      evidence: companyList.flatMap((c) => c.sources),
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
