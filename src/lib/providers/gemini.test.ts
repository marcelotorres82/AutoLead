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
      subsegment: "Consultoria e serviços de TI",
      coreBusiness:
        "Prestação de consultoria e serviços de tecnologia para empresas.",
      classificationReason:
        "A descrição institucional apresenta serviços de TI como atividade principal.",
      classificationSourceUrl: "https://example.com/fonte",
      classificationConfidence: 92,
      forbiddenSector: "none" as const,
      revenueModel: "services" as const,
      serviceRevenuePercentage: 100,
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
      signals: {
        employeeScale: "medium" as const,
        digitalPresence: "multi_channel" as const,
        transactionalExposure: "significant" as const,
        recentGrowth: "weak" as const,
        hasPublicApis: true,
        hasMobileOrWebApps: true,
        hasCloudFootprint: false,
        hasSecurityHiring: false,
        hasDistributedWorkloads: false,
        handlesSensitiveData: true,
        evidenceQuality: "high" as const,
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
    expect(analyzed[0].signals.evidenceQuality).toBe("high");
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.generationConfig.thinkingConfig).toEqual({
      thinkingBudget: 0,
    });
    expect(request.contents[0].parts[0].text).toContain(
      "empresas com até 500 funcionários",
    );
  });
});
