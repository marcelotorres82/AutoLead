import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listResearchRuns } from "@/lib/research-run-repository";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ runs: await listResearchRuns(30) });
}
