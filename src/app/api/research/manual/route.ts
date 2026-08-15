import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoMode } from "@/lib/env";
import { runDailyResearch } from "@/lib/research";
import { validOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  try {
    return NextResponse.json(
      await runDailyResearch(date, demoMode, `manual-${Date.now()}`),
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
