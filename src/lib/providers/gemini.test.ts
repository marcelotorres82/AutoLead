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

  it("analisa três lotes em paralelo e consolida duplicatas", async () => {
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

    expect(fetchMock).toHaveBeenCalledTimes(3);
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
});
