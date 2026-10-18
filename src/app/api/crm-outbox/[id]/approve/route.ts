import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth";
import { approveCrmOutboxItem } from "@/lib/crm-outbox-repository";
import { getClientIp } from "@/lib/rate-limit";
import { requestOriginValid } from "@/lib/security";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const { id } = await context.params;
  const actor =
    typeof session.email === "string" ? session.email : "Administrador";
  const item = await approveCrmOutboxItem(id, actor);
  if (!item)
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  await recordAuditLog({
    actorEmail: session.email,
    actorName: session.name,
    action: "CRM_OUTBOX_APPROVED",
    entity: "crm_outbox",
    entityId: id,
    ip: getClientIp(request),
  });
  return NextResponse.json({ item });
}
