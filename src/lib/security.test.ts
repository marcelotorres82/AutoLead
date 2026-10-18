import { describe, expect, it } from "vitest";
import {
  assertSafePublicUrl,
  isPrivateHostname,
  requestOriginValid,
  safeCompareSecrets,
  safeExternalHref,
  validOrigin,
} from "@/lib/security";

describe("URL safety & SSRF protection", () => {
  it.each([
    "localhost",
    "api.internal",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.2",
    "100.64.0.1",
    "169.254.169.254",
    "127.0.0.1",
    "::1",
    "fd00::1",
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "::ffff:a00:1",
    "::ffff:c0a8:101",
    "::ffff:ac10:1",
    "2001:db8::1",
  ])("bloqueia destino privado %s", (host) => {
    expect(isPrivateHostname(host)).toBe(true);
  });

  it("aceita URL pública HTTP(S) e IPv6 público", () => {
    expect(assertSafePublicUrl("https://example.com/path").hostname).toBe(
      "example.com",
    );
    expect(isPrivateHostname("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateHostname("::ffff:808:808")).toBe(false);
  });

  it("rejeita protocolo inválido e endereços IPv4-mapped IPv6 privados", () => {
    expect(() => assertSafePublicUrl("ftp://example.com/file")).toThrow();
    expect(() => assertSafePublicUrl("http://172.20.0.1/admin")).toThrow();
    expect(() =>
      assertSafePublicUrl("http://[::ffff:127.0.0.1]/admin"),
    ).toThrow();
    expect(() =>
      assertSafePublicUrl("http://[::ffff:169.254.169.254]/latest/meta-data"),
    ).toThrow();
  });
});

describe("Origin / CSRF validation", () => {
  it("rejeita subdomínios arbitrários da Vercel que não pertencem ao projeto", () => {
    expect(
      validOrigin("https://malicious-attacker.vercel.app", "autolead.com.br"),
    ).toBe(false);
  });

  it("aceita requisição same-origin correspondente ao host header", () => {
    expect(
      validOrigin("https://autolead.vercel.app", "autolead.vercel.app"),
    ).toBe(true);
  });

  it("bloqueia requisição com sec-fetch-site cross-site", () => {
    const req = new Request("https://autolead.vercel.app/api/backups", {
      method: "POST",
      headers: {
        host: "autolead.vercel.app",
        origin: "https://autolead.vercel.app",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(requestOriginValid(req)).toBe(false);
  });
});

describe("Constant-time secret comparison & safe external links", () => {
  it("compara segredos de forma segura", () => {
    expect(safeCompareSecrets("Bearer secret-123", "Bearer secret-123")).toBe(
      true,
    );
    expect(safeCompareSecrets("Bearer secret-123", "Bearer secret-124")).toBe(
      false,
    );
    expect(safeCompareSecrets("curto", "muito-mais-longo")).toBe(false);
    expect(safeCompareSecrets(null, "secret")).toBe(false);
  });

  it("higieniza links externos bloqueando javascript: e data:", () => {
    expect(safeExternalHref("https://www.linkedin.com/company/acme")).toBe(
      "https://www.linkedin.com/company/acme",
    );
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(
      safeExternalHref("data:text/html,<script>alert(1)</script>"),
    ).toBeNull();
    expect(safeExternalHref("")).toBeNull();
  });
});
