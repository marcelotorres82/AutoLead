import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateCsv } from "@/lib/csv";
import { demoCompanies } from "@/lib/demo-data";
export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const csv = generateCsv(
    demoCompanies.map((c) => ({
      nome: c.name,
      dominio: c.domain,
      vertical: c.vertical,
      solucao: c.solution,
      score: c.score,
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
