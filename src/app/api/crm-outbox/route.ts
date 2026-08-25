import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { listCrmOutbox, queueCompanyForCrm } from "@/lib/crm-outbox-repository";
import { validOrigin } from "@/lib/security";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ items: await listCrmOutbox() });
}

export async function POST(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin"), request.headers.get("host")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      destination: z.string().trim().min(2).max(100).default("Salesloft"),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  return NextResponse.json(
    {
      item: await queueCompanyForCrm(
        parsed.data.companyId,
        parsed.data.destination,
      ),
    },
    { status: 202 },
  );
}
