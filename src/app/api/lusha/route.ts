import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getLushaUsage, setLushaUsage } from "@/lib/operations-repository";
import { validOrigin } from "@/lib/security";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json(await getLushaUsage());
}

export async function PUT(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const parsed = z
    .object({ used: z.number().int().min(0).max(300) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Consumo inválido" }, { status: 400 });
  return NextResponse.json(await setLushaUsage(parsed.data.used));
}
