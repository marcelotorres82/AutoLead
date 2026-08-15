import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoMode } from "@/lib/env";
import { runDailyResearch } from "@/lib/research";
export async function POST() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const date = new Date().toISOString().slice(0, 10);
  return NextResponse.json(
    await runDailyResearch(`${date}-manual-${Date.now()}`, demoMode),
  );
}
