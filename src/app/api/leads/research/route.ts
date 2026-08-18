import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { enqueueLeadResearch } from "@/lib/enqueue-lead-research";
import { getLeadResearchContexts } from "@/lib/lead-repository";
import { validOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  companyIds: z.array(z.string().uuid()).min(1).max(5),
});

export async function POST(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Selecione entre 1 e 5 empresas válidas" },
      { status: 400 },
    );
  const companyIds = Array.from(new Set(parsed.data.companyIds));
  const contexts = await getLeadResearchContexts(companyIds);
  if (contexts.length !== companyIds.length)
    return NextResponse.json(
      { error: "Uma ou mais empresas não foram encontradas" },
      { status: 404 },
    );
  if (contexts.some((context) => !context.approved))
    return NextResponse.json(
      { error: "Aprove todas as empresas antes de pesquisar leads" },
      { status: 409 },
    );
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  try {
    const runs = await Promise.all(
      companyIds.map((companyId) => enqueueLeadResearch(companyId, date)),
    );
    return NextResponse.json({ runs }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao iniciar pesquisa de leads",
      },
      { status: 502 },
    );
  }
}
