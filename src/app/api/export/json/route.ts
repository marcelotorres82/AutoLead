import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { demoMode } from "@/lib/env";
import { listPersonas } from "@/lib/operations-repository";
import { listResearchRuns } from "@/lib/research-run-repository";
export async function GET(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const [allCompanies, personas, history] = demoMode
    ? [demoCompanies, [], []]
    : await Promise.all([
        listCompanies(),
        listPersonas(),
        listResearchRuns(500),
      ]);
  const selectedIds = new Set(
    new URL(request.url).searchParams.get("ids")?.split(",").slice(0, 100) ??
      [],
  );
  const companyList = selectedIds.size
    ? allCompanies.filter((company) => selectedIds.has(company.id))
    : allCompanies;
  return NextResponse.json(
    {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      filters: { mode: demoMode ? "demo" : "real" },
      companies: companyList,
      evidence: companyList.flatMap((c) => c.sources),
      personas: selectedIds.size
        ? personas.filter((persona) => selectedIds.has(persona.companyId))
        : personas,
      history,
    },
    {
      headers: {
        "content-disposition": `attachment; filename="prospect-radar.json"`,
        "cache-control": "no-store",
      },
    },
  );
}
