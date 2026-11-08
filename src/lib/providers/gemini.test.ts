import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import {
  GeminiAiProvider,
  geminiResponseJsonSchema,
} from "@/lib/providers/gemini";

const originalKey = env.GEMINI_API_KEY;

afterEach(() => {
  env.GEMINI_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

describe("Gemini", () => {
  it("gera JSON Schema compatível sem metadado de draft", () => {
    const schema = geminiResponseJsonSchema();
    expect(schema).not.toHaveProperty("$schema");
    expect(schema).toMatchObject({
      type: "object",
      properties: { companies: { type: "array" } },
      required: ["companies"],
    });
    expect(JSON.stringify(schema)).not.toMatch(
      /"(maxItems|maxLength|maximum|minItems|minLength|minimum|pattern)":/,
    );
  });

  it("mantém as fontes correlacionadas no mesmo lote e consolida duplicatas", async () => {
    env.GEMINI_API_KEY = "test-key";
    const company = {
      name: "Empresa Teste",
      tradeName: "Empresa Teste",
      domain: "empresa.test",
      vertical: "Business Services",
      subsegment: "Agências de publicidade e marketing",
      coreBusiness:
        "Prestação de serviços de publicidade, criação e marketing para empresas.",
      classificationReason:
        "A descrição institucional apresenta publicidade e marketing como atividade principal.",
      classificationSourceUrl: "https://example.com/fonte",
      operatesInBrazil: true as const,
      brazilOperationEvidence:
        "A empresa mantém operação comercial ativa em São Paulo, Brasil.",
      brazilOperationSourceUrl: "https://example.com/fonte",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      size: "Média",
      employees: "100-499",
      linkedinUrl: "https://www.linkedin.com/company/empresa-teste",
      criteriaMatch: "compatible" as const,
      criteriaReason: "O porte informado está dentro do limite solicitado.",
      criteriaConfidence: 85,
      description: "Empresa brasileira com operação digital documentada.",
      solution: "API Security" as const,
      apiScore: 70,
      waapScore: 60,
      guardicoreScore: 40,
      breakdown: {
        verticalFit: 15,
        sizeComplexity: 10,
        digitalPresence: 15,
        transactionalChannels: 10,
        recentSignals: 10,
        solutionFit: 8,
        evidenceQuality: 8,
      },
      recommendation:
        "Validar os canais digitais e iniciar contato consultivo.",
      evidence: [
        {
          kind: "fact" as const,
          content: "Operação digital identificada em fonte pública.",
          sourceUrl: "https://example.com/fonte",
        },
      ],
      titles: ["CTO"],
      navigatorQuery: "Empresa Teste CTO Brasil",
      tags: ["digital"],
    };
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({ companies: [company] }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const results = Array.from({ length: 6 }, (_, index) => ({
      title: `Fonte ${index}`,
      url: `https://example.com/${index}`,
      content: "Conteúdo público",
    }));

    const analyzed = await new GeminiAiProvider().analyzeBatch(
      results,
      "empresas com até 500 funcionários",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(analyzed).toHaveLength(1);
    expect(analyzed[0].breakdown.evidenceQuality).toBe(5);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.generationConfig.thinkingConfig).toEqual({
      thinkingBudget: 0,
    });
    expect(request.contents[0].parts[0].text).toContain(
      "empresas com até 500 funcionários",
    );
  });

  it("faz fallback automático de modelo quando o modelo principal retorna 503", async () => {
    env.GEMINI_API_KEY = "test-key";
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      callCount += 1;
      if (url.includes("gemini-2.5-flash:")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                message:
                  "This model is currently experiencing high demand. Please try again later.",
              },
            }),
            { status: 503 },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ companies: [] }) }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const analyzed = await new GeminiAiProvider().analyzeBatch([
      { title: "Fonte 1", url: "https://example.com/1", content: "Conteúdo" },
    ]);

    expect(analyzed).toEqual([]);
    expect(callCount).toBe(2);
    expect(fetchMock.mock.calls[0][0]).toContain("gemini-2.5-flash:");
    expect(fetchMock.mock.calls[1][0]).toContain("gemini-2.5-flash-lite:");
  });

  it("normaliza quote curta e headcount zero sem derrubar o lote nem chamar gemini-2.0-flash-lite", async () => {
    env.GEMINI_API_KEY = "test-key";
    const companyWithLooseFields = {
      name: "Varejo Brasil Digital",
      tradeName: "",
      domain: "varejobrasil.com.br",
      vertical: "Retail",
      subsegment: "Varejo e e-commerce",
      coreBusiness:
        "Operação de e-commerce omnichannel e varejo digital no mercado brasileiro.",
      classificationReason:
        "A empresa opera plataforma própria de comércio eletrônico no Brasil.",
      classificationSourceUrl: "https://varejobrasil.com.br/sobre",
      operatesInBrazil: true as const,
      brazilOperationEvidence:
        "Sede e centros de distribuição em São Paulo, atendendo todo o Brasil.",
      brazilOperationSourceUrl: "https://varejobrasil.com.br/sobre",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      size: "Média",
      employees: "200-500",
      linkedinUrl: "",
      criteriaMatch: "compatible" as const,
      criteriaReason: "Porte e vertical compatíveis.",
      criteriaConfidence: 80,
      description:
        "Varejista digital brasileira com plataforma de e-commerce própria.",
      solution: "WAAP" as const,
      apiScore: 75,
      waapScore: 82,
      guardicoreScore: 55,
      breakdown: {
        verticalFit: 18,
        sizeComplexity: 12,
        digitalPresence: 18,
        transactionalChannels: 14,
        recentSignals: 10,
        solutionFit: 8,
        evidenceQuality: 4,
      },
      recommendation:
        "Abordar liderança de tecnologia e segurança sobre proteção de APIs e WAAP.",
      evidence: [
        {
          criterion: "technology",
          quote: "curto",
          publishedAt: "",
          headcount: 0,
          kind: "fact" as const,
          content: "Plataforma de e-commerce ativa no Brasil.",
          sourceUrl: "https://varejobrasil.com.br/sobre",
        },
      ],
      titles: ["CTO"],
      navigatorQuery: "Varejo Brasil Digital CTO",
      tags: ["ecommerce"],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      companies: [companyWithLooseFields],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const analyzed = await new GeminiAiProvider().analyzeBatch([
      {
        title: "Sobre Varejo Brasil",
        url: "https://varejobrasil.com.br/sobre",
        content: "Conteúdo institucional no Brasil",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(analyzed).toHaveLength(1);
    expect(analyzed[0].evidence[0].quote).toBeNull();
    expect(analyzed[0].evidence[0].headcount).toBeNull();
  });
});
