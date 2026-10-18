import { NextResponse } from "next/server";
import { z } from "zod";
import { recordAuditLog } from "@/lib/audit-log";
import { createSession, sessionCookie, verifyCredentials } from "@/lib/auth";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit";
import { requestOriginValid } from "@/lib/security";

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!requestOriginValid(request))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const ip = getClientIp(request);
  const rate = checkRateLimit(`login:${ip}`);
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 },
    );
  let input;
  try {
    input = inputSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  if (!(await verifyCredentials(input.email, input.password)))
    return NextResponse.json(
      { error: "E-mail ou senha inválidos" },
      { status: 401 },
    );
  resetRateLimit(`login:${ip}`);
  const normalizedEmail = input.email.trim().toLowerCase();
  const isDemo = normalizedEmail === "demo@prospectradar.local";
  await recordAuditLog({
    actorEmail: normalizedEmail,
    actorName: isDemo ? "Demonstração" : "Administrador",
    action: "AUTH_LOGIN_SUCCESS",
    entity: "users",
    entityId: normalizedEmail,
    metadata: { provider: isDemo ? "demo" : "credentials" },
    ip,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    sessionCookie,
    await createSession({
      email: normalizedEmail,
      name: isDemo ? "Demonstração" : "Administrador",
      provider: isDemo ? "demo" : "credentials",
      role: "admin",
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    },
  );
  return response;
}
