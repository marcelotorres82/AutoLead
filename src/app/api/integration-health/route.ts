import { NextResponse } from "next/server";
import { integrationStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = integrationStatus();
  return NextResponse.json({
    database: status.database,
    exa: status.exa,
    telegram: status.telegram,
    authentication: status.authentication,
  });
}
