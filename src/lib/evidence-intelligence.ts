import { z } from "zod";
import { normalizeDomain, type Solution } from "@/lib/domain";
import type { SearchResult } from "@/lib/providers/types";

export const evidenceTypes = [
  "technology",
  "api",
  "application",
  "mobile_app",
  "cloud",
  "infrastructure",
  "security",
  "expansion",
  "digital_transformation",
  "job",
  "news",
  "ecommerce",
  "integration",
  "other",
] as const;
export type EvidenceType = (typeof evidenceTypes)[number];

export const statementKinds = ["FACT", "INFERENCE", "UNKNOWN"] as const;
export type StatementKind = (typeof statementKinds)[number];

export const technicalSignalSchema = z.object({
  type: z.string().min(1),
  value: z.string().min(1),
  sourceUrl: z.string().url(),
  detectionMethod: z.enum([
    "html",
    "headers",
    "dns",
    "structured_data",
    "public_document",
    "search",
    "website",
    "manual",
  ]),
  confidence: z.number().min(0).max(100),
  detectedAt: z.string().datetime(),
});
export type TechnicalSignal = z.infer<typeof technicalSignalSchema>;

export const evidenceRecordSchema = z.object({
  type: z.enum(evidenceTypes),
  statementKind: z.enum(statementKinds),
  claim: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().optional(),
  publisher: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  collectedAt: z.string().datetime(),
  excerpt: z.string().optional(),
  confidence: z.number().min(0).max(100),
  sourceQuality: z.number().min(0).max(100),
  freshnessScore: z.number().min(0).max(100),
  verified: z.boolean(),
  relevantSolutions: z.array(z.enum(["API Security", "WAAP", "Guardicore"])),
});
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export type EvidenceFirstScores = {
  digitalExposureScore: number;
  waapScore: number;
  apiSecurityScore: number;
  guardicoreScore: number;
  confidenceScore: number;
  opportunityScore: number;
  evidenceCount: number;
  independentSourceCount: number;
  algorithmVersion: "evidence-v1";
};

const patterns: Array<{
  type: EvidenceType;
  values: Array<{ value: string; regex: RegExp }>;
}> = [
  {
    type: "technology",
    values: [
      { value: "Next.js", regex: /\bnext(?:\.js|js)\b|__next_data__/i },
      { value: "React", regex: /\breact(?:\.js|js)?\b|data-reactroot/i },
      { value: "Angular", regex: /\bangular\b|ng-version/i },
      { value: "Vue", regex: /\bvue(?:\.js|js)?\b|data-v-/i },
      { value: "WordPress", regex: /wordpress|wp-content/i },
      { value: "Shopify", regex: /shopify/i },
      { value: "Magento", regex: /magento|adobe commerce/i },
      { value: "VTEX", regex: /\bvtex\b/i },
      {
        value: "Salesforce Commerce",
        regex: /salesforce commerce|demandware/i,
      },
      { value: "Cloudflare", regex: /cloudflare|cf-ray/i },
      { value: "AWS", regex: /\baws\b|amazon web services/i },
      { value: "Azure", regex: /\bazure\b|microsoft cloud/i },
      { value: "Google Cloud", regex: /google cloud|\bgcp\b/i },
      {
        value: "Google Analytics",
        regex: /google analytics|gtag\(|googletagmanager/i,
      },
    ],
  },
  {
    type: "api",
    values: [
      { value: "API", regex: /\bapis?\b/i },
      { value: "OpenAPI", regex: /openapi/i },
      { value: "Swagger", regex: /swagger/i },
      {
        value: "Developer portal",
        regex: /developer portal|portal de desenvolvedores/i,
      },
      { value: "API gateway", regex: /api gateway/i },
      { value: "Microservices", regex: /microservices|microsservi[cç]os/i },
    ],
  },
  {
    type: "application",
    values: [
      {
        value: "Mobile app",
        regex: /aplicativo|mobile app|app store|google play/i,
      },
      {
        value: "E-commerce",
        regex: /e-commerce|ecommerce|loja online|marketplace/i,
      },
      {
        value: "Login or portal",
        regex: /\blogin\b|portal do cliente|área do cliente/i,
      },
    ],
  },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "High";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Low";
  return "Insufficient";
}

export function calculateFreshnessScore(
  publishedAt?: string | Date | null,
  now = new Date(),
) {
  if (!publishedAt) return 45;
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return 35;
  const days = Math.max(0, (now.getTime() - published.getTime()) / 86_400_000);
  if (days <= 90) return 100;
  if (days <= 365) return 80;
  if (days <= 730) return 55;
  return 25;
}

export function calculateSourceQuality(
  sourceUrl: string,
  companyDomain?: string,
) {
  const domain = normalizeDomain(sourceUrl);
  const ownDomain = normalizeDomain(companyDomain ?? "");
  if (ownDomain && (domain === ownDomain || domain.endsWith(`.${ownDomain}`)))
    return 100;
  if (/\.gov\.br$|\.gov$|apps\.apple\.com$|play\.google\.com$/.test(domain))
    return 95;
  if (
    /reuters\.com$|bloomberg\.com$|valor\.globo\.com$|exame\.com$/.test(domain)
  )
    return 85;
  if (/linkedin\.com$|github\.com$/.test(domain)) return 70;
  return 55;
}

export function inferEvidenceType(text: string): EvidenceType {
  if (/vaga|carreira|contrata|job/i.test(text)) return "job";
  if (/app store|google play|aplicativo|mobile app/i.test(text))
    return "mobile_app";
  if (/api|openapi|swagger|integra[cç][aã]o|open banking/i.test(text))
    return "api";
  if (/cloud|aws|azure|gcp/i.test(text)) return "cloud";
  if (/e-?commerce|marketplace|loja online/i.test(text)) return "ecommerce";
  if (/expans[aã]o|nova unidade|inaugur|aquisi[cç][aã]o|fus[aã]o/i.test(text))
    return "expansion";
  if (/seguran[cç]a|zero trust|waf|ransomware/i.test(text)) return "security";
  if (
    /datacenter|data center|vmware|servidor|infraestrutura|\bot\b/i.test(text)
  )
    return "infrastructure";
  if (/transforma[cç][aã]o digital|moderniza[cç][aã]o/i.test(text))
    return "digital_transformation";
  return "other";
}

export function relevantSolutionsFor(text: string): Solution[] {
  const solutions: Solution[] = [];
  if (
    /api|openapi|swagger|integra[cç][aã]o|mobile|aplicativo|microservi/i.test(
      text,
    )
  )
    solutions.push("API Security");
  if (
    /e-?commerce|marketplace|login|portal|pagamento|aplica[cç][aã]o web|waf/i.test(
      text,
    )
  )
    solutions.push("WAAP");
  if (
    /datacenter|data center|vmware|h[ií]brid|servidor|\bot\b|zero trust|segmenta[cç][aã]o/i.test(
      text,
    )
  )
    solutions.push("Guardicore");
  return solutions;
}

export function detectTechnicalSignals(
  results: SearchResult[],
): TechnicalSignal[] {
  const detected = new Map<string, TechnicalSignal>();
  for (const result of results) {
    const text = `${result.title}\n${result.content}`;
    for (const group of patterns) {
      for (const item of group.values) {
        if (!item.regex.test(text)) continue;
        const key = `${item.value}:${result.url}`;
        detected.set(key, {
          type: group.type,
          value: item.value,
          sourceUrl: result.url,
          detectionMethod: "search",
          confidence: 70,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return [...detected.values()];
}

export function buildEvidenceRecord(input: {
  claim: string;
  kind: "fact" | "signal" | "hypothesis";
  result: SearchResult;
  companyDomain?: string;
  now?: Date;
}): EvidenceRecord {
  const now = input.now ?? new Date();
  const sourceQuality = calculateSourceQuality(
    input.result.url,
    input.companyDomain,
  );
  const freshnessScore = calculateFreshnessScore(input.result.publishedAt, now);
  const statementKind = input.kind === "hypothesis" ? "INFERENCE" : "FACT";
  return {
    type: inferEvidenceType(
      `${input.claim} ${input.result.title} ${input.result.content}`,
    ),
    statementKind,
    claim: input.claim,
    sourceUrl: input.result.url,
    sourceTitle: input.result.title,
    publisher: normalizeDomain(input.result.url),
    publishedAt: input.result.publishedAt
      ? new Date(input.result.publishedAt).toISOString()
      : undefined,
    collectedAt: now.toISOString(),
    excerpt: input.result.content.slice(0, 600),
    confidence: clamp(sourceQuality * 0.65 + freshnessScore * 0.35),
    sourceQuality,
    freshnessScore,
    verified: statementKind === "FACT" && sourceQuality >= 55,
    relevantSolutions: relevantSolutionsFor(
      `${input.claim} ${input.result.title} ${input.result.content}`,
    ),
  };
}

function weightedMatches(evidence: EvidenceRecord[], regex: RegExp) {
  return evidence.reduce((sum, item) => {
    if (!regex.test(`${item.claim} ${item.excerpt ?? ""}`)) return sum;
    const directness = item.statementKind === "FACT" ? 1 : 0.45;
    return sum + ((item.confidence + item.freshnessScore) / 200) * directness;
  }, 0);
}

export function calculateEvidenceFirstScores(
  evidence: EvidenceRecord[],
  signals: TechnicalSignal[] = [],
): EvidenceFirstScores {
  const sources = new Set(
    evidence.map((item) => normalizeDomain(item.sourceUrl)),
  );
  const facts = evidence.filter((item) => item.statementKind === "FACT");
  const inferences = evidence.length - facts.length;
  const avgQuality = evidence.length
    ? evidence.reduce((sum, item) => sum + item.sourceQuality, 0) /
      evidence.length
    : 0;
  const avgFreshness = evidence.length
    ? evidence.reduce((sum, item) => sum + item.freshnessScore, 0) /
      evidence.length
    : 0;
  const directRatio = evidence.length ? facts.length / evidence.length : 0;
  const confidenceScore = clamp(
    avgQuality * 0.35 +
      avgFreshness * 0.25 +
      Math.min(20, sources.size * 7) +
      directRatio * 20 -
      inferences * 3,
  );
  const digital = weightedMatches(
    evidence,
    /aplicativo|mobile|e-?commerce|marketplace|login|portal|digital|api|pagamento/i,
  );
  const api = weightedMatches(
    evidence,
    /api|openapi|swagger|developer portal|integra[cç][aã]o|open banking|microservi|api gateway/i,
  );
  const waap = weightedMatches(
    evidence,
    /e-?commerce|marketplace|login|portal|pagamento|aplica[cç][aã]o web|promo[cç][aã]o|waf/i,
  );
  const guardicore = weightedMatches(
    evidence,
    /datacenter|data center|h[ií]brid|vmware|workload|servidor|\bot\b|zero trust|segmenta[cç][aã]o|ransomware/i,
  );
  const signalBoost = Math.min(15, signals.length * 2);
  const digitalExposureScore = clamp(digital * 22 + signalBoost);
  const apiSecurityScore = clamp(api * 24 + signalBoost / 2);
  const waapScore = clamp(waap * 24 + digitalExposureScore * 0.15);
  const guardicoreScore = clamp(guardicore * 25 + signalBoost / 3);
  const bestFit = Math.max(apiSecurityScore, waapScore, guardicoreScore);
  const opportunityScore = clamp(bestFit * 0.7 + digitalExposureScore * 0.3);
  return {
    digitalExposureScore,
    waapScore,
    apiSecurityScore,
    guardicoreScore,
    confidenceScore,
    opportunityScore,
    evidenceCount: evidence.length,
    independentSourceCount: sources.size,
    algorithmVersion: "evidence-v1",
  };
}

export function recommendedSolutionFromScores(
  scores: Pick<
    EvidenceFirstScores,
    "apiSecurityScore" | "waapScore" | "guardicoreScore"
  >,
): Solution {
  const ranked: Array<[Solution, number]> = [
    ["API Security", scores.apiSecurityScore],
    ["WAAP", scores.waapScore],
    ["Guardicore", scores.guardicoreScore],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  return ranked[0][0];
}

export function passesEvidenceGate(
  scores: EvidenceFirstScores,
  evidence: EvidenceRecord[],
  solution: Solution,
) {
  const relevantEvidence = evidence.some(
    (item) =>
      item.verified &&
      item.statementKind === "FACT" &&
      item.relevantSolutions.includes(solution),
  );
  const passed =
    scores.opportunityScore >= 65 &&
    scores.confidenceScore >= 70 &&
    scores.evidenceCount >= 3 &&
    relevantEvidence;
  return {
    passed,
    status: passed ? ("READY" as const) : ("NEEDS_RESEARCH" as const),
    reasons: [
      scores.opportunityScore < 65 ? "Opportunity Score abaixo de 65" : null,
      scores.confidenceScore < 70 ? "Confidence Score abaixo de 70" : null,
      scores.evidenceCount < 3 ? "Menos de três evidências" : null,
      !relevantEvidence
        ? "Sem evidência direta relevante para a solução"
        : null,
    ].filter((reason): reason is string => Boolean(reason)),
  };
}
