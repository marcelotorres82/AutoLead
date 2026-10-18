import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth";
import { createPrivateBackup, listBackups } from "@/lib/backup-repository";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { requestOriginValid } from "@/lib/security";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ backups: await listBackups() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(`backup:${session.email}:${ip}`, 5, 15 * 60_000);
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Muitas solicitações de backup. Aguarde alguns minutos." },
      { status: 429 },
    );
  try {
    const backup = await createPrivateBackup();
    await recordAuditLog({
      actorEmail: session.email,
      actorName: session.name,
      action: "BACKUP_CREATED",
      entity: "backups",
      entityId: backup.id,
      ip,
    });
    return NextResponse.json({ backup }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no backup" },
      { status: 502 },
    );
  }
}
