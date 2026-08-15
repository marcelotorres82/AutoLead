import { z } from "zod";

export const companyStatuses = [
  "Nova",
  "Pendente de validação",
  "Aprovada para pesquisar leads",
  "Já é cliente",
  "Conta em atendimento",
  "Oportunidade recente",
  "Ex-cliente recente",
  "Pausada",
  "Sem aderência",
  "Duplicada",
  "Descartada",
  "Revisar depois",
] as const;
export type CompanyStatus = (typeof companyStatuses)[number];
export const solutions = ["API Security", "WAAP", "Guardicore"] as const;
export type Solution = (typeof solutions)[number];

export const scoreBreakdownSchema = z.object({
  verticalFit: z.number().min(0).max(20),
  sizeComplexity: z.number().min(0).max(15),
  digitalPresence: z.number().min(0).max(20),
  transactionalChannels: z.number().min(0).max(15),
  recentSignals: z.number().min(0).max(15),
  solutionFit: z.number().min(0).max(10),
  evidenceQuality: z.number().min(0).max(5),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string(),
  url: z.string().url(),
  publishedAt: z.string().optional(),
  accessedAt: z.string(),
  summary: z.string(),
});

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  tradeName: z.string().optional(),
  domain: z.string(),
  vertical: z.string(),
  subsegment: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  size: z.string(),
  employees: z.string().optional(),
  description: z.string(),
  solution: z.enum(solutions),
  score: z.number().min(0).max(100),
  apiScore: z.number().min(0).max(100),
  waapScore: z.number().min(0).max(100),
  guardicoreScore: z.number().min(0).max(100),
  breakdown: scoreBreakdownSchema,
  recommendation: z.string(),
  confirmedFacts: z.array(z.string()),
  commercialSignals: z.array(z.string()),
  hypotheses: z.array(z.string()),
  sources: z.array(sourceSchema),
  titles: z.array(z.string()),
  navigatorQuery: z.string(),
  status: z.enum(companyStatuses),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  discoveredAt: z.string(),
  reviewedAt: z.string().optional(),
  demo: z.boolean(),
  possibleDuplicate: z.boolean().default(false),
});
export type Company = z.infer<typeof companySchema>;

export const analyzedEvidenceSchema = z.object({
  kind: z.enum(["fact", "signal", "hypothesis"]),
  content: z.string().min(10).max(600),
  sourceUrl: z.string().url(),
});

export const analyzedCompanySchema = z.object({
  name: z.string().min(2).max(200),
  tradeName: z.string().max(200),
  domain: z.string().min(3).max(253),
  vertical: z.string().min(2).max(100),
  subsegment: z.string().min(2).max(120),
  city: z.string().max(100),
  state: z.string().max(100),
  country: z.string().min(2).max(100),
  size: z.string().min(2).max(100),
  employees: z.string().max(100),
  description: z.string().min(20).max(800),
  solution: z.enum(solutions),
  apiScore: z.number().int().min(0).max(100),
  waapScore: z.number().int().min(0).max(100),
  guardicoreScore: z.number().int().min(0).max(100),
  breakdown: scoreBreakdownSchema,
  recommendation: z.string().min(20).max(800),
  evidence: z.array(analyzedEvidenceSchema).min(1).max(12),
  titles: z.array(z.string().min(2).max(100)).max(12),
  navigatorQuery: z.string().min(5).max(800),
  tags: z.array(z.string().min(2).max(50)).max(12),
});

export const aiBatchAnalysisSchema = z.object({
  companies: z.array(analyzedCompanySchema).max(30),
});
export type AnalyzedCompany = z.infer<typeof analyzedCompanySchema>;

export const aiBatchResultSchema = z.object({
  companies: z.array(companySchema).max(100),
});

export function calculateScore(value: ScoreBreakdown): number {
  const parsed = scoreBreakdownSchema.parse(value);
  return Object.values(parsed).reduce((sum, part) => sum + part, 0);
}

export function normalizeDomain(value: string): string {
  const candidate = value.trim().toLowerCase();
  if (!candidate) return "";
  try {
    return new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`,
    ).hostname
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return candidate
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .replace(/^www\./, "")
      .replace(/:\d+$/, "");
  }
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(sa|s a|ltda|limitada|inc|corp|corporation|company|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function findDuplicate(
  candidate: Pick<Company, "name" | "domain">,
  companies: Pick<Company, "name" | "domain">[],
) {
  const domain = normalizeDomain(candidate.domain);
  const name = normalizeName(candidate.name);
  const exact = companies.find(
    (item) =>
      normalizeDomain(item.domain) === domain ||
      normalizeName(item.name) === name,
  );
  if (exact) return { duplicate: true, possible: false, match: exact };
  const possible = companies.find((item) => {
    const other = normalizeName(item.name);
    return (
      name.length > 5 &&
      other.length > 5 &&
      (name.includes(other) || other.includes(name))
    );
  });
  return { duplicate: false, possible: Boolean(possible), match: possible };
}

export function countsTowardGoal(status: CompanyStatus) {
  return status !== "Nova";
}
export function lushaMetrics(used: number, limit: number) {
  const percent =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent,
    alert: percent >= 95 ? 95 : percent >= 85 ? 85 : percent >= 70 ? 70 : null,
  };
}
