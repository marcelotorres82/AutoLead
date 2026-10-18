import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enqueueCompanyRefresh } from "@/lib/enqueue-company-refresh";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { requestOriginValid } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(
    `company-refresh:${session.email}:${ip}`,
    10,
    15 * 60_000,
  );
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Limite de atualizações atingido. Aguarde alguns minutos." },
      { status: 429 },
    );
  const { id } = await context.params;
  try {
    return NextResponse.json(await enqueueCompanyRefresh(id), { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao atualizar pesquisa";
    return NextResponse.json(
      { error: message },
      { status: /não encontrada/i.test(message) ? 404 : 400 },
    );
  }
}
