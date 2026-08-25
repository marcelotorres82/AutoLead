import { describe, expect, it } from "vitest";
import {
  generateIntelligentBatchCompanies,
  generateIntelligentMultiAiLeads,
} from "@/lib/lead-intelligence";
import { verticalTaxonomy } from "@/lib/domain";

describe("Lead Intelligence Multi-AI Engine", () => {
  it("gera personas abrangentes (Decisores, Influenciadores e Champions) por solução e vertical", () => {
    const context = {
      companyId: "01111111-1111-4111-8111-111111111111",
      companyName: "Magalu Digital",
      tradeName: "Magalu",
      domain: "magalu.com.br",
      solution: "API Security" as const,
      titles: ["CISO", "CTO"],
      subsegment: "Varejo e e-commerce",
    };

    const leads = generateIntelligentMultiAiLeads(context, [], 14);

    expect(leads.length).toBeGreaterThanOrEqual(10);

    const roles = new Set(leads.map((l) => l.role));
    expect(roles.has("Decisor")).toBe(true);
    expect(roles.has("Influenciador técnico")).toBe(true);
    expect(roles.has("Champion potencial")).toBe(true);

    for (const lead of leads) {
      expect(lead.name).toBeTruthy();
      expect(lead.title).toBeTruthy();
      expect(lead.profileUrl).toContain("linkedin.com/in/");
      expect(lead.evidence.length).toBeGreaterThan(0);
      expect(lead.confidence).toBeGreaterThanOrEqual(70);
    }
  });

  it("gera empresas analisadas válidas respeitando as verticais ativas", () => {
    const activeVerticals = ["Retail", "Business Services"] as const;
    const companies = generateIntelligentBatchCompanies(activeVerticals, undefined, [], 4);

    expect(companies.length).toBeGreaterThan(0);

    for (const company of companies) {
      expect(activeVerticals).toContain(company.vertical);
      expect(verticalTaxonomy[company.vertical]).toContain(company.subsegment);
      expect(company.name).toBeTruthy();
      expect(company.coreBusiness).toBeTruthy();
      expect(company.apiScore).toBeGreaterThan(0);
      expect(company.breakdown.verticalFit).toBeGreaterThan(0);
      expect(company.evidence.length).toBeGreaterThan(0);
    }
  });
});
