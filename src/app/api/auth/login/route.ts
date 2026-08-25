import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, sessionCookie, verifyCredentials } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { validOrigin } from "@/lib/security";
const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!validOrigin(request.headers.get("origin"), host))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const rate = checkRateLimit(ip);
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
  resetRateLimit(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, await createSession(input.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
