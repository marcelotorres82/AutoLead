import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { approveCrmOutboxItem } from "@/lib/crm-outbox-repository";
import { validOrigin } from "@/lib/security";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const { id } = await context.params;
  const actor =
    typeof session.email === "string" ? session.email : "Administrador";
  const item = await approveCrmOutboxItem(id, actor);
  if (!item)
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  return NextResponse.json({ item });
}
