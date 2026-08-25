import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  calculateScore,
  findDuplicate,
  normalizeDomain,
  normalizeName,
  nameSimilarity,
  lushaMetrics,
  countsTowardGoal,
  aiBatchResultSchema,
  aiBatchAnalysisSchema,
  verifiedLinkedInCompanyUrl,
  extractEmployeeLimit,
  extractEmployeeUpperBound,
  isForbiddenSectorCompany,
  hasBrazilOperationEvidence,
  isBrazilCountry,
  isValidVerticalClassification,
  verticalNames,
} from "@/lib/domain";
import { demoCompanies } from "@/lib/demo-data";
describe("normalização", () => {
  it("normaliza domínio", () =>
    expect(normalizeDomain("HTTPS://www.Exemplo.com.br/path")).toBe(
      "exemplo.com.br",
    ));
  it("normaliza nome e razão social", () =>
    expect(normalizeName("Árvore Digital Ltda.")).toBe("arvore digital"));
  it("identifica variações de nome por similaridade conservadora", () =>
    expect(
      nameSimilarity("Companhia Digital Brasil", "Compania Digital Brasil"),
    ).toBeGreaterThanOrEqual(0.85));
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
describe("taxonomia comercial", () => {
  it("mantém as nove verticais configuradas", () => {
    expect(verticalNames).toHaveLength(9);
    expect(verticalNames).toContain("Video Media");
  });

  it("aceita somente pares exatos de vertical e subvertical", () => {
    expect(isValidVerticalClassification("Retail", "Varejo e e-commerce")).toBe(
      true,
    );
    expect(isValidVerticalClassification("Retail", "Logística")).toBe(false);
    expect(isValidVerticalClassification("Healthcare", "Diagnósticos")).toBe(
      false,
    );
  });
});
describe("atuação no Brasil", () => {
  it("aceita somente país Brasil e evidência explícita de operação local", () => {
    expect(isBrazilCountry("Brasil")).toBe(true);
    expect(isBrazilCountry("Brazil")).toBe(true);
    expect(isBrazilCountry("Argentina")).toBe(false);
    expect(
      hasBrazilOperationEvidence(
        {
          operatesInBrazil: true,
          country: "Brasil",
          brazilOperationEvidence:
            "A empresa mantém escritório e operação comercial em São Paulo.",
        },
        { content: "Conheça nosso escritório de São Paulo, SP." },
      ),
    ).toBe(true);
  });

  it("rejeita empresa sem confirmação brasileira", () => {
    expect(
      hasBrazilOperationEvidence(
        {
          operatesInBrazil: true,
          country: "México",
          brazilOperationEvidence: "A empresa atende a América Latina.",
        },
        { content: "Operações no México, Chile e Colômbia." },
      ),
    ).toBe(false);
  });
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

describe("Validação de Core Business e Exclusão de Setores", () => {
  it("rejeita explicitamente empresas do setor financeiro, adquirentes e bancos", () => {
    const stone = isForbiddenSectorCompany({
      name: "Stone Pagamentos S.A.",
      coreBusiness:
        "Adquirência, maquininhas de cartão e soluções de pagamento para lojistas",
    });
    expect(stone.forbidden).toBe(true);

    const nubank = isForbiddenSectorCompany({
      name: "Nubank",
      coreBusiness: "Serviços de banco digital e cartão de crédito",
    });
    expect(nubank.forbidden).toBe(true);

    const picpay = isForbiddenSectorCompany({
      name: "PicPay",
      coreBusiness: "Carteira digital, pagamentos PIX e marketplace financeiro",
    });
    expect(picpay.forbidden).toBe(true);
  });

  it("rejeita indústrias pesadas, hospitais e operadoras de telefonia", () => {
    const hospital = isForbiddenSectorCompany({
      name: "Laboratório Fleury",
      coreBusiness: "Medicina diagnóstica e análises clínicas",
    });
    expect(hospital.forbidden).toBe(true);

    const gerdau = isForbiddenSectorCompany({
      name: "Gerdau S.A.",
      coreBusiness: "Produção de aço e siderurgia",
    });
    expect(gerdau.forbidden).toBe(true);
  });

  it("aprova varejo legítimo e rejeita consultorias de tecnologia", () => {
    const retail = isForbiddenSectorCompany({
      name: "Magalu Digital",
      tradeName: "Magalu",
      coreBusiness:
        "Comércio varejista omnichannel e venda de bens de consumo pela internet",
    });
    expect(retail.forbidden).toBe(false);

    const itConsulting = isForbiddenSectorCompany({
      name: "CI&T Software",
      coreBusiness:
        "Desenvolvimento e consultoria especializada em engenharia de software e transformação digital",
    });
    expect(itConsulting.forbidden).toBe(true);
  });

  it("rejeita Globant, Claranet e Thoughtworks pelo core business", () => {
    for (const company of [
      {
        name: "Globant Brasil",
        coreBusiness:
          "Consultoria de tecnologia focada em inovação, transformação digital e engenharia de software",
      },
      {
        name: "Claranet Brasil",
        coreBusiness:
          "Provedora de serviços gerenciados de TI, conectividade e nuvem",
      },
      {
        name: "Thoughtworks Brasil",
        coreBusiness:
          "Consultoria global de tecnologia e serviços de engenharia de software",
      },
    ]) {
      expect(isForbiddenSectorCompany(company)).toMatchObject({
        forbidden: true,
      });
    }
  });
});
