import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listDailyLeadQueue } from "@/lib/daily-queue";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ queue: await listDailyLeadQueue() });
}
