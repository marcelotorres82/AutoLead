import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const sessionCookie = "prospect-radar-session";
const fallbackDemoSecret = "prospect-radar-demo-secret-local-only-32-chars";
const secret = () =>
  new TextEncoder().encode(env.AUTH_SECRET ?? fallbackDemoSecret);
export async function createSession(email: string) {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}
export async function verifySession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}
export async function getSession() {
  return verifySession((await cookies()).get(sessionCookie)?.value);
}
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
export async function verifyCredentials(email: string, password: string) {
  const isDemoLogin =
    process.env.NODE_ENV !== "production" &&
    email === "demo@prospectradar.local" &&
    password === "demo1234";

  if (isDemoLogin) return true;
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) return false;

  return (
    email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() &&
    (await compare(password, env.ADMIN_PASSWORD_HASH))
  );
}
