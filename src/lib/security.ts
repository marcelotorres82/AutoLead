import { isIP } from "node:net";
import { z } from "zod";

const privateHost =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|::1$|fc|fd)/i;
export function assertSafePublicUrl(input: string) {
  const url = z.string().url().parse(input);
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Protocolo não permitido");
  if (
    privateHost.test(parsed.hostname) ||
    (isIP(parsed.hostname) && privateHost.test(parsed.hostname))
  )
    throw new Error("Destino privado não permitido");
  return parsed;
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
