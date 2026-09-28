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
  requestUrl: string,
): boolean {
  if (!origin) return false;
  try {
    const parsedOrigin = new URL(origin);
    const requestOrigin = new URL(requestUrl).origin;
    return parsedOrigin.origin.toLowerCase() === requestOrigin.toLowerCase();
  } catch {
    return false;
  }
}
