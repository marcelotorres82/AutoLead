import { describe, expect, it } from "vitest";
import { evaluateVerticalGate } from "@/lib/vertical-gate";

const base = {
  vertical: "Business Services",
  subvertical: "Consultoria e serviços de TI",
  coreBusiness:
    "Consultoria e serviços gerenciados de tecnologia para grandes empresas.",
  classificationConfidence: 92,
  forbiddenSector: "none" as const,
  revenueModel: "services" as const,
  serviceRevenuePercentage: 90,
  activeVerticals: new Set(["Business Services"]),
};

describe("gate de vertical", () => {
  it("aceita consultoria de tecnologia orientada a serviços", () => {
    expect(evaluateVerticalGate(base)).toMatchObject({
      accepted: true,
      reason: "accepted",
    });
  });

  it("bloqueia fintech mesmo quando classificada como tecnologia", () => {
    expect(
      evaluateVerticalGate({
        ...base,
        forbiddenSector: "fintech",
        coreBusiness:
          "Fintech que oferece crédito e serviços financeiros por aplicativo.",
      }),
    ).toMatchObject({
      accepted: false,
      reason: "forbidden_financial_sector",
    });
  });

  it("não confunde clientes financeiros com o core business", () => {
    expect(
      evaluateVerticalGate({
        ...base,
        coreBusiness:
          "Consultoria de infraestrutura e serviços gerenciados para bancos e empresas de serviços financeiros.",
      }),
    ).toMatchObject({ accepted: true });
  });

  it("impede fornecedor SaaS de herdar a vertical do cliente", () => {
    expect(
      evaluateVerticalGate({
        ...base,
        vertical: "Retail",
        subvertical: "Varejo e e-commerce",
        coreBusiness:
          "Desenvolvedora de software SaaS para operação de lojas virtuais.",
        revenueModel: "product",
        serviceRevenuePercentage: 0,
        activeVerticals: new Set(["Retail"]),
      }),
    ).toMatchObject({
      accepted: false,
      reason: "technology_wrong_vertical",
    });
  });

  it("bloqueia empresa de produto e manda receita mista limítrofe à revisão", () => {
    expect(
      evaluateVerticalGate({ ...base, revenueModel: "product" }),
    ).toMatchObject({
      accepted: false,
      reason: "technology_product_company",
    });
    expect(
      evaluateVerticalGate({
        ...base,
        revenueModel: "mixed",
        serviceRevenuePercentage: 50,
      }),
    ).toMatchObject({
      accepted: false,
      requiresManualReview: true,
    });
  });

  it("rejeita vertical inativa e confiança menor que 85", () => {
    expect(
      evaluateVerticalGate({ ...base, activeVerticals: new Set() }),
    ).toMatchObject({ reason: "inactive_vertical" });
    expect(
      evaluateVerticalGate({ ...base, classificationConfidence: 84 }),
    ).toMatchObject({ reason: "low_classification_confidence" });
  });
});
