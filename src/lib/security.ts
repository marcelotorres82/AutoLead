import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";

function isPrivateIPv4Octets(a: number, b: number) {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateHostname(hostname: string) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    return true;
  const version = isIP(host);
  if (version === 4) {
    const [a, b] = host.split(".").map(Number);
    return isPrivateIPv4Octets(a, b);
  }
  if (version === 6) {
    if (
      host === "::" ||
      host === "::1" ||
      /^f[cd]/.test(host) ||
      /^fe[89ab]/.test(host) ||
      /^ff/.test(host) ||
      /^2001:db8(?::|$)/.test(host) ||
      /^100::/.test(host)
    ) {
      return true;
    }
    if (host.startsWith("::ffff:")) {
      const mapped = host.slice("::ffff:".length);
      if (isIP(mapped) === 4) {
        const [a, b] = mapped.split(".").map(Number);
        return isPrivateIPv4Octets(a, b);
      }
      const hexParts = mapped.split(":");
      if (hexParts.length === 2) {
        const hi = Number.parseInt(hexParts[0], 16);
        if (!Number.isNaN(hi)) {
          const a = (hi >> 8) & 0xff;
          const b = hi & 0xff;
          return isPrivateIPv4Octets(a, b);
        }
      } else if (hexParts.length === 1) {
        const low = Number.parseInt(hexParts[0], 16);
        if (!Number.isNaN(low)) {
          return isPrivateIPv4Octets(0, 0);
        }
      }
    }
    return false;
  }
  return false;
}

export function assertSafePublicUrl(input: string) {
  const url = z.string().url().parse(input);
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Protocolo não permitido");
  if (isPrivateHostname(parsed.hostname))
    throw new Error("Destino privado não permitido");
  return parsed;
}

export function safeExternalHref(input?: string | null): string | null {
  if (!input) return null;
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function safeCompareSecrets(
  actual: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!actual || !expected) return false;
  const hashA = createHash("sha256").update(actual).digest();
  const hashB = createHash("sha256").update(expected).digest();
  return timingSafeEqual(hashA, hashB) && actual.length === expected.length;
}

export function validOrigin(
  origin: string | null,
  hostHeader?: string | null,
): boolean {
  if (!origin) return true;
  try {
    const parsedOrigin = new URL(origin);
    const originHost = parsedOrigin.host.toLowerCase();
    const originHostname = parsedOrigin.hostname.toLowerCase();

    // Permitir requisições locais em ambiente de desenvolvimento/teste
    if (
      process.env.NODE_ENV !== "production" &&
      (originHostname === "localhost" ||
        originHostname === "127.0.0.1" ||
        originHostname === "::1" ||
        originHostname.endsWith(".localhost"))
    ) {
      return true;
    }

    // Permitir se corresponder ao header host da requisição (same-origin)
    if (hostHeader) {
      const normalizedHost = hostHeader.split(",")[0].trim().toLowerCase();
      const hostWithoutPort = normalizedHost.replace(/:\d+$/, "");
      if (
        originHost === normalizedHost ||
        originHostname === normalizedHost ||
        originHostname === hostWithoutPort
      ) {
        return true;
      }
    }

    // Validar contra URLs configuradas no ambiente
    const allowedEnvUrls = [
      process.env.APP_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      process.env.VERCEL_BRANCH_URL
        ? `https://${process.env.VERCEL_BRANCH_URL}`
        : undefined,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
    ].filter(Boolean);

    for (const envUrl of allowedEnvUrls) {
      try {
        const parsedEnv = new URL(envUrl!);
        if (
          parsedEnv.origin.toLowerCase() ===
            parsedOrigin.origin.toLowerCase() ||
          parsedEnv.hostname.toLowerCase() === originHostname
        ) {
          return true;
        }
      } catch {
        // Ignorar URLs inválidas de ambiente
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function requestOriginValid(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") return false;
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin) return validOrigin(origin, host);
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return validOrigin(new URL(referer).origin, host);
    } catch {
      return false;
    }
  }
  return true;
}
