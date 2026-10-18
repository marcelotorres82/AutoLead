import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth";
import { updateCompanyStatus } from "@/lib/company-repository";
import { companyStatuses } from "@/lib/domain";
import { getClientIp } from "@/lib/rate-limit";
import { requestOriginValid } from "@/lib/security";

const inputSchema = z.object({ status: z.enum(companyStatuses) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  let input;
  try {
    input = inputSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { id } = await context.params;
  const updated = await updateCompanyStatus(
    id,
    input.status,
    session.email,
    session.name,
  );
  if (!updated)
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  await recordAuditLog({
    actorEmail: session.email,
    actorName: session.name,
    action: "COMPANY_STATUS_UPDATED",
    entity: "companies",
    entityId: id,
    metadata: { status: input.status },
    ip: getClientIp(request),
  });
  return NextResponse.json({ ok: true });
}
