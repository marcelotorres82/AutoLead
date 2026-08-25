import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  aiLeadAnalysisSchema,
  buildLeadSearchQueries,
  verifiedLinkedInPersonUrl,
} from "@/lib/lead-domain";

const context = {
  companyId: "01111111-1111-4111-8111-111111111111",
  companyName: "Empresa Teste",
  tradeName: "Teste",
  domain: "empresa.test",
  solution: "API Security" as const,
  titles: ["CTO", "Head de Segurança"],
};

describe("pesquisa de leads", () => {
  it("gera consultas complementares e dinâmicas por empresa", () => {
    const queries = buildLeadSearchQueries(context);

    expect(queries).toHaveLength(5);
    expect(queries.join(" ")).toContain("Empresa Teste");
    expect(queries.join(" ")).toContain("CTO");
    expect(queries).toContainEqual(expect.stringContaining("linkedin.com/in"));
    expect(queries).toContainEqual(expect.stringContaining("empresa.test"));
  });

  it("aceita somente URL pública exata de pessoa no LinkedIn", () => {
    const profile = "https://br.linkedin.com/in/pessoa-teste";

    expect(verifiedLinkedInPersonUrl(profile, [profile])).toBe(profile);
    expect(
      verifiedLinkedInPersonUrl("https://linkedin.com/company/teste", [
        "https://linkedin.com/company/teste",
      ]),
    ).toBeUndefined();
    expect(verifiedLinkedInPersonUrl(profile, [])).toBeUndefined();
  });

  it("valida evidência e vínculo sem exigir contato pessoal", () => {
    const parsed = aiLeadAnalysisSchema.parse({
      leads: [
        {
          name: "Pessoa Teste",
          title: "CTO",
          seniority: "Diretoria",
          area: "Tecnologia",
          role: "Decisor",
          profileUrl: "",
          confidence: 80,
          employmentStatus: "provável",
          reason: "O cargo tem influência direta sobre a solução pesquisada.",
          evidence: [
            {
              content:
                "A fonte pública associa a pessoa à empresa e ao cargo atual.",
              sourceUrl: "https://example.com/lideranca",
            },
          ],
        },
      ],
    });

    expect(parsed.leads[0].employmentStatus).toBe("provável");
    expect(
      JSON.stringify(zodTextFormat(aiLeadAnalysisSchema, "leads")),
    ).not.toContain('"format":"uri"');
  });
});
