import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enqueueCompanyRefresh } from "@/lib/enqueue-company-refresh";
import { validOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
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
