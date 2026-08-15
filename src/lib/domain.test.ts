import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  calculateScore,
  findDuplicate,
  normalizeDomain,
  normalizeName,
  lushaMetrics,
  countsTowardGoal,
  aiBatchResultSchema,
  aiBatchAnalysisSchema,
  verifiedLinkedInCompanyUrl,
  extractEmployeeLimit,
  extractEmployeeUpperBound,
} from "@/lib/domain";
import { demoCompanies } from "@/lib/demo-data";
describe("normalização", () => {
  it("normaliza domínio", () =>
    expect(normalizeDomain("HTTPS://www.Exemplo.com.br/path")).toBe(
      "exemplo.com.br",
    ));
  it("normaliza nome e razão social", () =>
    expect(normalizeName("Árvore Digital Ltda.")).toBe("arvore digital"));
});
describe("score", () =>
  it("soma componentes validados", () =>
    expect(
      calculateScore({
        verticalFit: 20,
        sizeComplexity: 15,
        digitalPresence: 20,
        transactionalChannels: 15,
        recentSignals: 15,
        solutionFit: 10,
        evidenceQuality: 5,
      }),
    ).toBe(100)));
describe("duplicidades", () =>
  it("detecta domínio normalizado", () =>
    expect(
      findDuplicate(
        { name: "Outra", domain: "www.aurora-demo.example" },
        demoCompanies,
      ).duplicate,
    ).toBe(true)));
describe("IA", () => {
  it("valida resposta estruturada", () =>
    expect(
      aiBatchResultSchema.parse({ companies: demoCompanies }).companies,
    ).toHaveLength(4));
  it("gera schema compatível com Structured Outputs", () =>
    expect(
      JSON.stringify(zodTextFormat(aiBatchAnalysisSchema, "batch")),
    ).not.toContain('"format":"uri"'));
});
describe("LinkedIn", () => {
  it("aceita somente perfil empresarial HTTPS presente nas fontes", () => {
    const profile = "https://br.linkedin.com/company/empresa-teste";
    expect(verifiedLinkedInCompanyUrl(profile, [profile])).toBe(profile);
    expect(
      verifiedLinkedInCompanyUrl("https://linkedin.com/in/pessoa", [
        "https://linkedin.com/in/pessoa",
      ]),
    ).toBeUndefined();
    expect(
      verifiedLinkedInCompanyUrl("https://linkedin.com/company/inventada", []),
    ).toBeUndefined();
  });
});
describe("critérios de porte", () => {
  it("extrai limite da pesquisa e teto da faixa de funcionários", () => {
    expect(
      extractEmployeeLimit("empresas de ecommerce com até 1.000 funcionários"),
    ).toBe(1000);
    expect(extractEmployeeLimit("no máximo 1,000 funcionários")).toBe(1000);
    expect(extractEmployeeUpperBound("501–1.000 funcionários")).toBe(1000);
    expect(extractEmployeeUpperBound("501-1,000 funcionários")).toBe(1000);
    expect(extractEmployeeUpperBound("1.001-5.000")).toBe(5000);
  });
});
describe("metas", () =>
  it("conta decisão humana", () => {
    expect(countsTowardGoal("Nova")).toBe(false);
    expect(countsTowardGoal("Pausada")).toBe(true);
  }));
describe("Lusha", () =>
  it("calcula alerta", () =>
    expect(lushaMetrics(260, 300)).toMatchObject({
      remaining: 40,
      alert: 85,
    })));
