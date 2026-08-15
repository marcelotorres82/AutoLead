import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createPrivateBackup, listBackups } from "@/lib/backup-repository";
import { validOrigin } from "@/lib/security";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ backups: await listBackups() });
}

export async function POST(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const backup = await createPrivateBackup();
    return NextResponse.json({ backup }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no backup" },
      { status: 502 },
    );
  }
}
