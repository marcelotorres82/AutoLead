import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/company-repository";

export async function GET() {
  if (!(await getSession()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  return NextResponse.json({ companies: await listCompanies() });
}
