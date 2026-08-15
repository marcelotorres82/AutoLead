import { NextResponse } from "next/server";
import { env, demoMode } from "@/lib/env";
import { cronAuthorized, runDailyResearch } from "@/lib/research";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), env.CRON_SECRET))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  try {
    const result = await runDailyResearch(date, demoMode);
    return NextResponse.json(result, {
      status: result.status === "duplicate" ? 200 : 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Erro inesperado",
      },
      { status: 503 },
    );
  }
}
