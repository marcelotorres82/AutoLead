import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { updateCompanyStatus } from "@/lib/company-repository";
import { companyStatuses } from "@/lib/domain";
import { validOrigin } from "@/lib/security";

const inputSchema = z.object({ status: z.enum(companyStatuses) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!validOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  let input;
  try {
    input = inputSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { id } = await context.params;
  const updated = await updateCompanyStatus(id, input.status);
  if (!updated)
    return NextResponse.json(
      { error: "Empresa não encontrada" },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
