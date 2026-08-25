import { describe, expect, it } from "vitest";
import { cacheTtl, isCacheFresh } from "@/lib/research-cache";

describe("research cache", () => {
  it("usa TTLs distintos por natureza do dado", () => {
    expect(cacheTtl.news).toBe(86_400_000);
    expect(cacheTtl.companyProfile).toBeGreaterThan(cacheTtl.news);
  });

  it("considera apenas entradas não expiradas", () => {
    const now = new Date("2026-08-22T12:00:00Z");
    expect(isCacheFresh("2026-08-22T13:00:00Z", now)).toBe(true);
    expect(isCacheFresh("2026-08-22T11:00:00Z", now)).toBe(false);
    expect(isCacheFresh("inválido", now)).toBe(false);
  });
});
