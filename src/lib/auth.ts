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
  const configured = env.AUTH_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return new TextEncoder().encode(configured);
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error(
      "AUTH_SECRET é obrigatória em ambiente de produção (mínimo de 16 caracteres).",
    );
  }
  return new TextEncoder().encode(fallbackDemoSecret);
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

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function normalizeBcryptCandidates(rawHash?: string): string[] {
  if (!rawHash) return [];
  const trimmed = rawHash
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\\$/g, "$");
  const candidates = new Set<string>();
  if (BCRYPT_HASH_REGEX.test(trimmed)) {
    candidates.add(trimmed);
  }
  try {
    const decoded = Buffer.from(trimmed, "base64")
      .toString("utf8")
      .trim()
      .replace(/\\\$/g, "$");
    if (BCRYPT_HASH_REGEX.test(decoded)) {
      candidates.add(decoded);
    }
  } catch {
    // Ignorar falha de decode base64
  }
  const stripped = trimmed.replace(/^\$+/, "");
  if (/^[./A-Za-z0-9]{53}$/.test(stripped)) {
    for (const prefix of ["$2b$12$", "$2b$10$", "$2a$12$", "$2a$10$"]) {
      candidates.add(`${prefix}${stripped}`);
    }
  }
  return Array.from(candidates);
}

export async function verifyCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rawHash = env.ADMIN_PASSWORD_HASH?.trim().replace(/^["']|["']$/g, "");
  const rawPassword = env.ADMIN_PASSWORD?.trim();
  const bcryptCandidates = normalizeBcryptCandidates(rawHash);
  const hasValidPasswordConfig = Boolean(
    rawPassword || bcryptCandidates.length > 0,
  );

  const isDemoLogin =
    (process.env.NODE_ENV !== "production" || !hasValidPasswordConfig) &&
    normalizedEmail === "demo@prospectradar.local" &&
    password === "demo1234";

  if (isDemoLogin) return true;

  const allowedAdminEmails = [
    env.ADMIN_EMAIL?.trim().toLowerCase(),
    PRIMARY_AUTHORIZED_EMAIL,
  ].filter((item): item is string => Boolean(item));

  if (!allowedAdminEmails.includes(normalizedEmail)) return false;

  if (rawPassword && password === rawPassword) {
    return true;
  }

  for (const candidateHash of bcryptCandidates) {
    try {
      if (await compare(password, candidateHash)) return true;
    } catch {
      // Testar próximo formato candidato
    }
  }

  if (rawHash && !rawHash.startsWith("$") && password === rawHash) {
    return true;
  }

  return false;
}
