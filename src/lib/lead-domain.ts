import { z } from "zod";
import { solutions } from "@/lib/domain";

export const leadReviewStatuses = [
  "Pendente de validação",
  "Aprovado",
  "Descartado",
] as const;
export type LeadReviewStatus = (typeof leadReviewStatuses)[number];

export const employmentStatuses = [
  "confirmado",
  "provável",
  "incerto",
] as const;
export type EmploymentStatus = (typeof employmentStatuses)[number];

export const leadRoles = [
  "Decisor",
  "Influenciador técnico",
  "Champion potencial",
] as const;

export const leadResearchContextSchema = z.object({
  companyId: z.string().uuid(),
  companyName: z.string(),
  tradeName: z.string().optional(),
  domain: z.string(),
  solution: z.enum(solutions),
  titles: z.array(z.string()),
});
export type LeadResearchContext = z.infer<typeof leadResearchContextSchema>;

export const analyzedLeadEvidenceSchema = z.object({
  content: z.string().min(10).max(600),
  sourceUrl: z.string().min(8).max(2048),
});

export const analyzedLeadSchema = z.object({
  name: z.string().min(2).max(160),
  title: z.string().min(2).max(160),
  seniority: z.string().min(2).max(80),
  area: z.string().min(2).max(80),
  role: z.enum(leadRoles),
  profileUrl: z.string().max(2048),
  confidence: z.number().int().min(0).max(100),
  employmentStatus: z.enum(employmentStatuses),
  reason: z.string().min(20).max(600),
  evidence: z.array(analyzedLeadEvidenceSchema).min(1).max(5),
});
export const aiLeadAnalysisSchema = z.object({
  leads: z.array(analyzedLeadSchema).max(20),
});
export type AnalyzedLead = z.infer<typeof analyzedLeadSchema>;

const solutionTitles: Record<LeadResearchContext["solution"], string[]> = {
  "API Security": [
    "CISO",
    "AppSec",
    "DevSecOps",
    "API Security",
    "Plataformas Digitais",
  ],
  WAAP: [
    "CISO",
    "AppSec",
    "Segurança da Informação",
    "DevSecOps",
    "Aplicações Digitais",
  ],
  Guardicore: [
    "CISO",
    "Infraestrutura",
    "Redes",
    "Security Architecture",
    "Zero Trust",
  ],
};

export function buildLeadSearchQueries(context: LeadResearchContext) {
  const company = JSON.stringify(context.companyName);
  const titles = Array.from(
    new Set([
      ...context.titles.slice(0, 5),
      ...solutionTitles[context.solution],
    ]),
  ).slice(0, 10);
  const titleExpression = titles.map((title) => `"${title}"`).join(" OR ");
  return [
    `${company} (${titleExpression}) Brasil liderança`,
    `site:linkedin.com/in ${company} (${titleExpression})`,
    `site:${context.domain} (liderança OR diretoria OR equipe) (segurança OR tecnologia OR infraestrutura OR APIs)`,
    `${company} (nomeado OR assume OR contratação OR promoção) (${titleExpression})`,
  ];
}

export function verifiedLinkedInPersonUrl(
  candidate: string,
  sourceUrls: Iterable<string>,
) {
  if (!candidate || !new Set(sourceUrls).has(candidate)) return undefined;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isLinkedIn =
      hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
    return url.protocol === "https:" &&
      isLinkedIn &&
      /^\/in\/[^/]+\/?$/i.test(url.pathname)
      ? candidate
      : undefined;
  } catch {
    return undefined;
  }
}
