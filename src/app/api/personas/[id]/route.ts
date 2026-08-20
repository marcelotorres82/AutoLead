import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { leadReviewStatuses } from "@/lib/lead-domain";
import { updatePersonaReviewStatus } from "@/lib/operations-repository";
import { validOrigin } from "@/lib/security";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const parsed = z
    .object({ reviewStatus: z.enum(leadReviewStatuses) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Revisão inválida" }, { status: 400 });
  const { id } = await context.params;
  if (!(await updatePersonaReviewStatus(id, parsed.data.reviewStatus)))
    return NextResponse.json(
      { error: "Persona não encontrada" },
      { status: 404 },
    );
  return NextResponse.json({ id, reviewStatus: parsed.data.reviewStatus });
}
