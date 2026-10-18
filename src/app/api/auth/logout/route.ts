import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit-log";
import { getSession, sessionCookie } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";
import { requestOriginValid } from "@/lib/security";

export async function POST(request: Request) {
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const session = await getSession();
  if (session?.email) {
    await recordAuditLog({
      actorEmail: session.email,
      actorName: session.name,
      action: "AUTH_LOGOUT",
      entity: "users",
      entityId: session.email,
      ip: getClientIp(request),
    });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
