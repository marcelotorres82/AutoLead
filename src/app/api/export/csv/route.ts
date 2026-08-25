import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateCsv } from "@/lib/csv";
import { listCompanies } from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { demoMode } from "@/lib/env";
export async function GET(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const allCompanies = demoMode ? demoCompanies : await listCompanies();
  const selectedIds = new Set(
    new URL(request.url).searchParams.get("ids")?.split(",").slice(0, 100) ??
      [],
  );
  const companyList = selectedIds.size
    ? allCompanies.filter((company) => selectedIds.has(company.id))
    : allCompanies;
  const csv = generateCsv(
    companyList.map((c) => ({
      nome: c.name,
      dominio: c.domain,
      linkedin: c.linkedinUrl ?? "",
      vertical: c.vertical,
      solucao: c.solution,
      score: c.score,
      opportunity: c.opportunityScore ?? c.score,
      confidence: c.confidenceScore ?? 0,
      exposicao_digital: c.digitalExposureScore ?? 0,
      waap: c.waapScore,
      api_security: c.apiScore,
      guardicore: c.guardicoreScore,
      qualificacao: c.qualificationStatus ?? "NEEDS_RESEARCH",
      evidencias: (c.evidenceDetails ?? []).length,
      fontes: c.sources.map((source) => source.url).join(" | "),
      why_now: c.recommendation,
      status: c.status,
      observacao: c.notes ?? "",
    })),
  );
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prospect-radar-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
