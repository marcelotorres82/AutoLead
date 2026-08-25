import { isIP } from "node:net";
import { z } from "zod";

export function isPrivateHostname(hostname: string) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    return true;
  const version = isIP(host);
  if (version === 4) {
    const [a, b] = host.split(".").map(Number);
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
  if (version === 6)
    return (
      host === "::" ||
      host === "::1" ||
      /^f[cd]/.test(host) ||
      /^fe[89ab]/.test(host) ||
      /^::ffff:(?:0\.|10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/.test(
        host,
      )
    );
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

export function validOrigin(
  origin: string | null,
  hostHeader?: string | null,
): boolean {
  if (!origin) return true;
  try {
    const parsedOrigin = new URL(origin);
    const originHost = parsedOrigin.host.toLowerCase();
    const originHostname = parsedOrigin.hostname.toLowerCase();

    // Permitir requisições locais
    if (
      originHostname === "localhost" ||
      originHostname === "127.0.0.1" ||
      originHostname === "::1" ||
      originHostname.endsWith(".localhost")
    ) {
      return true;
    }

    // Permitir qualquer preview/deployment da Vercel para o projeto
    if (originHostname.endsWith(".vercel.app")) {
      return true;
    }

    // Permitir se corresponder ao header host da requisição (same-origin)
    if (
      hostHeader &&
      (originHost === hostHeader.toLowerCase() ||
        originHostname === hostHeader.toLowerCase())
    ) {
      return true;
    }

    // Validar contra URLs configuradas no ambiente
    const allowedEnvUrls = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
    ].filter(Boolean);

    for (const envUrl of allowedEnvUrls) {
      try {
        if (
          new URL(envUrl!).origin.toLowerCase() ===
          parsedOrigin.origin.toLowerCase()
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
