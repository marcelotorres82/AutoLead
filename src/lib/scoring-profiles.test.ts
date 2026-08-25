import { describe, expect, it } from "vitest";
import { applyScoringProfile, scoringProfileFor } from "@/lib/scoring-profiles";

const base = {
  digitalExposureScore: 70,
  waapScore: 70,
  apiSecurityScore: 60,
  guardicoreScore: 50,
  confidenceScore: 80,
  opportunityScore: 70,
  evidenceCount: 4,
  independentSourceCount: 2,
  algorithmVersion: "evidence-v1" as const,
};

describe("scoring profiles", () => {
  it("preserva o perfil padrão para uma vertical existente", () => {
    expect(scoringProfileFor("Hospitality").version).toBe("prospect-v2.0");
  });

  it("aplica o peso de WAAP para Retail sem alterar a taxonomia", () => {
    const result = applyScoringProfile(base, "Retail");
    expect(result.waapScore).toBe(77);
    expect(result.profileVersion).toBe("prospect-v2.0");
  });

  it("penaliza score sem evidência mínima", () => {
    const result = applyScoringProfile(
      { ...base, evidenceCount: 1, independentSourceCount: 0 },
      "Hospitality",
    );
    expect(result.opportunityScore).toBeLessThan(base.opportunityScore);
  });
});
