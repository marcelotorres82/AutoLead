import { compare } from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const sessionCookie = "prospect-radar-session";
export const PRIMARY_AUTHORIZED_EMAIL = "marcelotorres1982@gmail.com";
const fallbackDemoSecret = "prospect-radar-demo-secret-local-only-32-chars";

export type SessionUser = {
  email: string;
  name?: string;
  picture?: string;
  provider?: "google" | "credentials" | "demo";
  role?: "admin";
};

export type AppSessionPayload = JWTPayload & {
  email: string;
  name?: string;
  picture?: string;
  provider?: "google" | "credentials" | "demo";
  role: "admin";
};

export function getAuthSecretKey() {
  if (process.env.NODE_ENV === "production" && !env.AUTH_SECRET) {
    throw new Error(
      "AUTH_SECRET é obrigatória em ambiente de produção (mínimo de 32 caracteres).",
    );
  }
  return new TextEncoder().encode(env.AUTH_SECRET ?? fallbackDemoSecret);
}

export function isAuthorizedGoogleEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowedList = (env.ALLOWED_GOOGLE_EMAILS || PRIMARY_AUTHORIZED_EMAIL)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowedList.includes(normalized);
}

export async function createSession(input: string | SessionUser) {
  const user: SessionUser =
    typeof input === "string"
      ? { email: input, provider: "credentials", role: "admin" }
      : input;

  return new SignJWT({
    email: user.email.trim().toLowerCase(),
    name: user.name,
    picture: user.picture,
    provider: user.provider ?? "credentials",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getAuthSecretKey());
}

export async function verifySession(
  token?: string,
): Promise<AppSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (typeof payload.email !== "string" || !payload.email) return null;
    return payload as AppSessionPayload;
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
  const normalizedEmail = email.trim().toLowerCase();
  const isDemoLogin =
    process.env.NODE_ENV !== "production" &&
    normalizedEmail === "demo@prospectradar.local" &&
    password === "demo1234";

  if (isDemoLogin) return true;
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) return false;

  return (
    normalizedEmail === env.ADMIN_EMAIL.trim().toLowerCase() &&
    (await compare(password, env.ADMIN_PASSWORD_HASH))
  );
}
