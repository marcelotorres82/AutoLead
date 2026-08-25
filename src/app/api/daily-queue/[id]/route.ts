import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { updateDailyQueueItem } from "@/lib/daily-queue";
import { validOrigin } from "@/lib/security";

const schema = z.object({
  status: z.enum(["READY", "CLAIMED", "CONTACTED", "SNOOZED", "DISMISSED"]),
  actor: z.string().trim().max(200).optional(),
  outcome: z.string().trim().max(100).optional(),
  note: z.string().trim().max(1_000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Estado da fila inválido" },
      { status: 400 },
    );
  const { id } = await context.params;
  if (!(await updateDailyQueueItem(id, parsed.data)))
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
