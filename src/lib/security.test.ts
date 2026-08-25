import { describe, expect, it } from "vitest";
import { assertSafePublicUrl, isPrivateHostname } from "@/lib/security";

describe("URL safety", () => {
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
  ])("bloqueia destino privado %s", (host) => {
    expect(isPrivateHostname(host)).toBe(true);
  });

  it("aceita URL pública HTTP(S)", () => {
    expect(assertSafePublicUrl("https://example.com/path").hostname).toBe(
      "example.com",
    );
  });

  it("rejeita protocolo e rede privada", () => {
    expect(() => assertSafePublicUrl("ftp://example.com/file")).toThrow();
    expect(() => assertSafePublicUrl("http://172.20.0.1/admin")).toThrow();
  });
});
