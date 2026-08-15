import { describe, expect, it } from "vitest";
import {
  calculateScore,
  findDuplicate,
  normalizeDomain,
  normalizeName,
  lushaMetrics,
  countsTowardGoal,
  aiBatchResultSchema,
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
describe("IA", () =>
  it("valida resposta estruturada", () =>
    expect(
      aiBatchResultSchema.parse({ companies: demoCompanies }).companies,
    ).toHaveLength(4)));
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
