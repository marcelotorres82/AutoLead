import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { setVerticalActive } from "@/lib/operations-repository";
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
    .object({ active: z.boolean() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  const { id } = await context.params;
  const vertical = await setVerticalActive(id, parsed.data.active);
  if (!vertical)
    return NextResponse.json(
      { error: "Vertical não encontrada" },
      { status: 404 },
    );
  return NextResponse.json({ vertical });
}
