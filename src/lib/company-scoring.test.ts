import { describe, expect, it } from "vitest";
import { calculateCompanyScores } from "@/lib/company-scoring";

const signals = {
  employeeScale: "large" as const,
  digitalPresence: "high_scale" as const,
  transactionalExposure: "critical" as const,
  recentGrowth: "strong" as const,
  hasPublicApis: true,
  hasMobileOrWebApps: true,
  hasCloudFootprint: true,
  hasSecurityHiring: true,
  hasDistributedWorkloads: true,
  handlesSensitiveData: true,
  evidenceQuality: "high" as const,
};

describe("scoring determinístico", () => {
  it("produz o mesmo resultado para os mesmos sinais", () => {
    expect(calculateCompanyScores(signals)).toEqual(
      calculateCompanyScores({ ...signals }),
    );
  });

  it("mantém todos os scores e o breakdown dentro dos limites", () => {
    const result = calculateCompanyScores(signals);
    expect(Object.values(result.scores).every((score) => score <= 100)).toBe(
      true,
    );
    expect(
      Object.values(result.breakdown).reduce((a, b) => a + b, 0),
    ).toBeLessThanOrEqual(100);
  });
});
