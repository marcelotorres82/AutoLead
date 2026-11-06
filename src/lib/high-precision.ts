/** Deterministic qualification. Search/model confidence never substitutes for proof. */
export const precisionVersion = "precision-v2" as const;
export const criteriaKeys = [
  "headcount",
  "technology",
  "growth",
  "roadmap",
] as const;
export type Criterion = (typeof criteriaKeys)[number];
export type PrecisionClaim = {
  kind?: string;
  criterion?: Criterion | null;
  quote?: string | null;
  sourceUrl: string;
  publishedAt?: string | null;
  headcount?: number | null;
};
export type PublicSource = {
  url: string;
  title: string;
  content: string;
  publishedAt?: string;
};
export type PrecisionPolicy = {
  minEmployeesExclusive: number;
  targetYear: number;
  recentDays: number;
};
export const defaultPrecisionPolicy: PrecisionPolicy = {
  minEmployeesExclusive: 0,
  targetYear: 2027,
  recentDays: 365,
};
export const legalValidationPolicy: PrecisionPolicy = {
  ...defaultPrecisionPolicy,
  minEmployeesExclusive: 1000,
};
export type AuditedEvidence = {
  criterion: Criterion;
  quote: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
  collectedAt: string;
  headcount?: number;
};
export type QualificationReport = {
  version: typeof precisionVersion;
  qualified: boolean;
  score: number;
  evaluatedAt: string;
  policy: PrecisionPolicy;
  breakdown: Record<
    Criterion,
    { score: number; max: number; evidence: AuditedEvidence[] }
  >;
  reasons: string[];
  rejectedEvidence: Array<{ sourceUrl: string; reason: string }>;
};
const weights: Record<Criterion, number> = {
  headcount: 20,
  technology: 30,
  growth: 25,
  roadmap: 25,
};
const normalize = (value: string) =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();
function host(value: string) {
  try {
    const u = new URL(value.includes("://") ? value : `https://${value}`);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.hostname.replace(/^www\./, "")
      : "";
  } catch {
    return "";
  }
}
export function policyForCriteria(criteria = ""): PrecisionPolicy {
  const match = criteria.match(
    /(?:mais de|acima de|over|more than|>)\s*([\d.,]+)\s*(?:funcion|colaborador|integrante|employee|people|staff)/i,
  );
  return {
    ...defaultPrecisionPolicy,
    minEmployeesExclusive: match ? Number(match[1].replace(/[.,]/g, "")) : 0,
  };
}
function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value.slice(0, 10)
    ? date
    : undefined;
}
export function isRecentEvidence(value: string, now = new Date(), days = 365) {
  const date = validDate(value);
  return (
    !!date &&
    date.getTime() <= now.getTime() &&
    now.getTime() - date.getTime() <= days * 86400000
  );
}
/** Only unambiguous numerical headcounts; never revenue, clients, offices or range upper bounds. */
export function quoteHeadcounts(quote: string): number[] {
  const result: number[] = [];
  const re =
    /\b(\d{1,3}(?:[.,]\d{3})+|\d{3,})\s*(?:\+\s*)?(?:employees|people|staff|lawyers|professionals|colaboradores|funcionários|integrantes|advogados|profissionais)\b/gi;
  for (const match of quote.matchAll(re)) {
    const prefix = quote.slice(Math.max(0, match.index! - 25), match.index);
    if (
      /(?:[-–—]|\bto|\ba|up to|até|less than|menos de|aproximadamente|approximately|around|cerca de)\s*$/i.test(
        prefix,
      )
    )
      continue;
    result.push(Number(match[1].replace(/[.,]/g, "")));
  }
  return result;
}
const tech =
  /\b(cloud|azure|aws|artificial intelligence|generative ai|data engineering|CIO|CTO)\b|inteligência artificial|transformação digital|automação|automation|legal ops|engenharia de dados/i;
const action =
  /adot|implement|invest|deploy|launch|roll.?out|moderniz|migra|appoint|nomead|contrat|hired|lider|chief|head of|diretor/i;
const growth =
  /expan|hiring|hired|recruit|opened|opening|new office|merger|acquisition|funding|grew|growth|award|contrat|vaga|cresci|inaugur|fusão|aquisição|captação|prêmio|novo contrato/i;
const plan =
  /strateg|strategy|roadmap|plan|program|programme|invest|moderniz|governan|budget|orçamento|roll.?out|implement/i;
export function qualifyCompany(input: {
  name: string;
  domain: string;
  claims: PrecisionClaim[];
  sources: PublicSource[];
  policy?: PrecisionPolicy;
  now?: Date;
}): QualificationReport {
  const now = input.now ?? new Date();
  const policy = input.policy ?? defaultPrecisionPolicy;
  const breakdown: QualificationReport["breakdown"] = {
    headcount: { score: 0, max: weights.headcount, evidence: [] },
    technology: { score: 0, max: weights.technology, evidence: [] },
    growth: { score: 0, max: weights.growth, evidence: [] },
    roadmap: { score: 0, max: weights.roadmap, evidence: [] },
  };
  const report: QualificationReport = {
    version: precisionVersion,
    qualified: false,
    score: 0,
    evaluatedAt: now.toISOString(),
    policy,
    breakdown,
    reasons: [],
    rejectedEvidence: [],
  };
  const sources = new Map(input.sources.map((s) => [s.url, s]));
  const seen = new Set<string>();
  for (const claim of input.claims) {
    const source = sources.get(claim.sourceUrl);
    const key = claim.criterion;
    const quote = normalize(claim.quote ?? "");
    let reason = "";
    const published = validDate(source?.publishedAt);
    const sourceHost = host(claim.sourceUrl),
      companyHost = host(input.domain);
    const ownSource =
      !!companyHost &&
      (sourceHost === companyHost || sourceHost.endsWith(`.${companyHost}`));
    if (claim.kind === "hypothesis") reason = "Hipótese não é evidência";
    else if (!key || !criteriaKeys.includes(key)) reason = "Critério ausente";
    else if (!source || !sourceHost) reason = "Fonte HTTPS não coletada";
    else if (quote.length < 30 || !normalize(source.content).includes(quote))
      reason = "Citação não encontrada literalmente no conteúdo coletado";
    else if (
      !ownSource &&
      !normalize(quote)
        .toLowerCase()
        .includes(normalize(input.name).toLowerCase())
    )
      reason = "Citação de terceiro não identifica a empresa";
    else if (!published || published > now)
      reason = "Data original ausente, inválida ou futura";
    else if (
      claim.publishedAt &&
      claim.publishedAt.slice(0, 10) !== published.toISOString().slice(0, 10)
    )
      reason = "Data declarada diverge da fonte";
    else if (
      !isRecentEvidence(
        published.toISOString(),
        now,
        key === "growth" ? policy.recentDays : 730,
      )
    )
      reason = "Evidência fora da janela temporal";
    else if (
      key === "headcount" &&
      (!claim.headcount ||
        !quoteHeadcounts(quote).includes(claim.headcount) ||
        claim.headcount <= policy.minEmployeesExclusive)
    )
      reason = `Porte não comprovado acima de ${policy.minEmployeesExclusive}`;
    else if (
      (key === "technology" || key === "roadmap") &&
      /(?:advis(?:e|ed|ing)|assessor|clientes? planejam|clients? plan|regulat(?:ion|ory)|legisla|não (?:adot|implement|invest)|not (?:adopt|implement|invest)|does not|no plans)/i.test(
        quote,
      )
    )
      reason =
        "Assessoria a terceiros, regulação ou negativa não comprovam investimento próprio";
    else if (key === "technology" && (!tech.test(quote) || !action.test(quote)))
      reason = "Sem ação concreta de maturidade tecnológica";
    else if (key === "growth" && !growth.test(quote))
      reason = "Sem sinal concreto de crescimento";
    else if (
      key === "roadmap" &&
      (!new RegExp(`\\b${policy.targetYear}\\b`).test(quote) ||
        !plan.test(quote) ||
        !tech.test(quote))
    )
      reason = `Sem projeto tecnológico explícito para ${policy.targetYear}`;
    if (reason) {
      report.rejectedEvidence.push({ sourceUrl: claim.sourceUrl, reason });
      continue;
    }
    const identity = `${key}:${claim.sourceUrl}:${quote}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    breakdown[key!].evidence.push({
      criterion: key!,
      quote,
      sourceUrl: claim.sourceUrl,
      sourceTitle: source!.title,
      publishedAt: published!.toISOString(),
      collectedAt: now.toISOString(),
      ...(key === "headcount"
        ? { headcount: claim.headcount ?? undefined }
        : {}),
    });
  }
  for (const key of criteriaKeys) {
    const criterion = breakdown[key];
    criterion.score = criterion.evidence.length ? criterion.max : 0;
    report.score += criterion.score;
    if (!criterion.evidence.length)
      report.reasons.push(`Sem comprovação: ${key}`);
  }
  report.qualified = report.reasons.length === 0;
  return report;
}
/** Re-evaluate freshness at consumption time; old persisted READY flags cannot bypass the gate. */
export function isCurrentQualification(
  report: QualificationReport | undefined,
  now = new Date(),
) {
  return (
    report?.version === precisionVersion &&
    report.qualified === true &&
    criteriaKeys.every((key) =>
      report.breakdown?.[key]?.evidence?.some((e) =>
        isRecentEvidence(
          e.publishedAt,
          now,
          key === "growth" ? report.policy.recentDays : 730,
        ),
      ),
    )
  );
}
