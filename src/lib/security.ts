import { isIP } from "node:net";
import { z } from "zod";

const reservedHostname =
  /(^|\.)(localhost|local|internal|test|example|invalid|onion)$/i;

function isReservedIpv4(hostname: string) {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => part < 0 || part > 255))
    return false;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && [0, 2].includes(c)) ||
    (a === 192 && b === 168) ||
    (a === 198 && [18, 19].includes(b)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isReservedIpv6(hostname: string) {
  const value = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (value.startsWith("::ffff:"))
    return isReservedIpv4(value.slice("::ffff:".length));
  return (
    value === "::" ||
    value === "::1" ||
    /^f[cd]/.test(value) ||
    /^fe[89ab]/.test(value) ||
    value.startsWith("2001:db8:")
  );
}

export function assertSafePublicUrl(input: string) {
  const url = z.string().url().parse(input);
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Protocolo não permitido");
  if (parsed.username || parsed.password)
    throw new Error("Credenciais na URL não são permitidas");
  const hostname = parsed.hostname.toLowerCase();
  const plainHostname = hostname.replace(/^\[|\]$/g, "");
  if (
    reservedHostname.test(hostname) ||
    (isIP(plainHostname) === 4 && isReservedIpv4(plainHostname)) ||
    (isIP(plainHostname) === 6 && isReservedIpv6(plainHostname))
  )
    throw new Error("Destino privado ou reservado não permitido");
  return parsed;
}

export function isSafePublicUrl(input: string) {
  try {
    assertSafePublicUrl(input);
    return true;
  } catch {
    return false;
  }
}

export function isPublicCompanyDomain(input: string) {
  const value = input.trim();
  if (!value) return false;
  try {
    const url = assertSafePublicUrl(
      value.includes("://") ? value : `https://${value}`,
    );
    return url.hostname.includes(".") && !isIP(url.hostname);
  } catch {
    return false;
  }
}

export function isOfficialCompanySource(domain: string, sourceUrl: string) {
  if (!isPublicCompanyDomain(domain)) return false;
  try {
    const companyHost = new URL(
      domain.includes("://") ? domain : `https://${domain}`,
    ).hostname.replace(/^www\./, "");
    const sourceHost = assertSafePublicUrl(sourceUrl).hostname.replace(
      /^www\./,
      "",
    );
    return sourceHost === companyHost || sourceHost.endsWith(`.${companyHost}`);
  } catch {
    return false;
  }
}

export function validOrigin(origin: string | null) {
  if (!origin) return true;
  try {
    return (
      new URL(origin).origin ===
      new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").origin
    );
  } catch {
    return false;
  }
}
