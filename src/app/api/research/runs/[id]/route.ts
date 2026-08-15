import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getResearchRun } from "@/lib/research-run-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  const run = await getResearchRun(id);
  if (!run)
    return NextResponse.json(
      { error: "Execução não encontrada" },
      { status: 404 },
    );
  return NextResponse.json({ run });
}
