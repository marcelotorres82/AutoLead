import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { enqueueResearch } from "@/lib/enqueue-research";
import { demoMode } from "@/lib/env";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { runDailyResearch } from "@/lib/research";
import { requestOriginValid } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  query: z.string().trim().min(5).max(300),
  forceRefresh: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(
    `manual-research:${session.email}:${ip}`,
    12,
    15 * 60_000,
  );
  if (!rate.allowed)
    return NextResponse.json(
      {
        error: "Limite de pesquisas manuais atingido. Aguarde alguns minutos.",
      },
      { status: 429 },
    );
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Informe um critério de pesquisa entre 5 e 300 caracteres" },
      { status: 400 },
    );
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  try {
    if (!demoMode) {
      const run = await enqueueResearch(
        date,
        `manual-${crypto.randomUUID()}`,
        parsed.data.query,
        parsed.data.forceRefresh,
      );
      console.log(
        JSON.stringify({
          level: "info",
          message: "research_enqueued",
          route: "/api/research/manual",
          requestId: request.headers.get("x-vercel-id"),
          runId: run.id,
        }),
      );
      return NextResponse.json({ run }, { status: 202 });
    }
    return NextResponse.json(
      await runDailyResearch(
        date,
        demoMode,
        `manual-${Date.now()}`,
        parsed.data.query,
        undefined,
        parsed.data.forceRefresh,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao executar pesquisa pública",
      },
      { status: 502 },
    );
  }
}
