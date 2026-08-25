import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { leadReviewStatuses } from "@/lib/lead-domain";
import { createPersona, listPersonas } from "@/lib/operations-repository";
import { validOrigin } from "@/lib/security";

const personaSchema = z.object({
  name: z.string().trim().min(2).max(160),
  title: z.string().trim().min(2).max(160),
  companyId: z.string().uuid(),
  profileUrl: z.union([z.literal(""), z.string().url()]).optional(),
  seniority: z.string().trim().min(2).max(80),
  area: z.string().trim().min(2).max(80),
  solution: z.string().trim().min(2).max(80),
  priority: z.number().int().min(1).max(3),
  role: z.string().trim().min(2).max(80),
  notes: z.string().max(1000).optional(),
  reviewStatus: z.enum(leadReviewStatuses).default("Pendente de validação"),
});

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ personas: await listPersonas() });
}

export async function POST(request: Request) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const parsed = personaSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Dados da persona inválidos" },
      { status: 400 },
    );
  const persona = await createPersona(parsed.data);
  return NextResponse.json({ persona }, { status: 201 });
}
