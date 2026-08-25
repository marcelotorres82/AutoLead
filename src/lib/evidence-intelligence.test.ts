import { describe, expect, it } from "vitest";
import {
  buildEvidenceRecord,
  calculateEvidenceFirstScores,
  calculateFreshnessScore,
  calculateSourceQuality,
  detectTechnicalSignals,
  passesEvidenceGate,
  relevantSolutionsFor,
} from "@/lib/evidence-intelligence";

const now = new Date("2026-08-22T12:00:00.000Z");

function evidence(
  claim: string,
  url: string,
  content = claim,
  publishedAt = "2026-08-01T12:00:00.000Z",
) {
  return buildEvidenceRecord({
    claim,
    kind: "fact",
    companyDomain: "empresa.com.br",
    now,
    result: { title: claim, url, content, publishedAt },
  });
}

describe("evidence intelligence", () => {
  it("reduz o peso de evidências antigas e desconhecidas", () => {
    expect(calculateFreshnessScore("2026-08-01", now)).toBe(100);
    expect(calculateFreshnessScore("2023-01-01", now)).toBe(25);
    expect(calculateFreshnessScore(undefined, now)).toBe(45);
  });

  it("prioriza fonte oficial sem tratar agregador como equivalente", () => {
    expect(
      calculateSourceQuality(
        "https://empresa.com.br/noticias",
        "empresa.com.br",
      ),
    ).toBe(100);
    expect(
      calculateSourceQuality(
        "https://diretorio.example/empresa",
        "empresa.com.br",
      ),
    ).toBe(55);
  });

  it("detecta tecnologia apenas quando há sinal positivo", () => {
    const signals = detectTechnicalSignals([
      {
        title: "Vaga de engenharia",
        url: "https://empresa.com.br/carreiras",
        content: "Experiência com AWS, OpenAPI e Next.js.",
      },
    ]);
    expect(signals.map((signal) => signal.value)).toEqual(
      expect.arrayContaining(["AWS", "OpenAPI", "Next.js"]),
    );
    expect(
      detectTechnicalSignals([
        {
          title: "Institucional",
          url: "https://empresa.com.br",
          content: "Conteúdo institucional sem informação de WAF.",
        },
      ]).some((signal) => /waf/i.test(signal.value)),
    ).toBe(false);
  });

  it("não transforma aplicativo em afirmação automática de API exposta", () => {
    expect(relevantSolutionsFor("Aplicativo oficial na App Store")).toContain(
      "API Security",
    );
    expect("Aplicativo oficial na App Store").not.toMatch(/API exposta/i);
  });

  it("aplica evidence gate somente com score, confiança e evidência relevante", () => {
    const records = [
      evidence(
        "Portal de desenvolvedores publicou documentação OpenAPI e API gateway.",
        "https://empresa.com.br/developers",
      ),
      evidence(
        "Aplicativo oficial passou a integrar novos serviços digitais via APIs.",
        "https://apps.apple.com/br/app/empresa/id123",
      ),
      evidence(
        "Vaga oficial menciona microservices, integração e APIs.",
        "https://empresa.com.br/carreiras/api",
      ),
    ];
    const scores = calculateEvidenceFirstScores(records);
    expect(scores.confidenceScore).toBeGreaterThanOrEqual(70);
    expect(scores.opportunityScore).toBeGreaterThanOrEqual(65);
    expect(passesEvidenceGate(scores, records, "API Security").passed).toBe(
      true,
    );
    const insufficient = records.slice(0, 2);
    expect(
      passesEvidenceGate(
        calculateEvidenceFirstScores(insufficient),
        insufficient,
        "API Security",
      ).passed,
    ).toBe(false);
  });
});
