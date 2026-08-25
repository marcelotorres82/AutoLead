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

export const verticalTaxonomy = {
  "Business Services": ["Agências de publicidade e marketing", "Logística"],
  Education: [
    "Ensino básico/K-12",
    "Universidades",
    "Treinamento técnico e profissional",
  ],
  "Federal and Central": [
    "Defesa e inteligência",
    "Setor civil federal/central",
  ],
  Hospitality: ["Hotelaria e turismo"],
  "Non-Profit": ["Organizações sem fins lucrativos", "Assistência social"],
  "Other Media": [
    "AdTech",
    "Música e filmes",
    "Portais e buscadores",
    "Editoras",
    "Times e ligas esportivas",
  ],
  Retail: ["Varejo e e-commerce"],
  "State, Regional and Local": ["Setor público estadual, regional e local"],
  "Video Media": ["Workflow de vídeo e OVP", "Transmissão/broadcast", "OTT"],
} as const;

export const verticalNames = Object.keys(verticalTaxonomy) as [
  keyof typeof verticalTaxonomy,
  ...(keyof typeof verticalTaxonomy)[],
];
export type Vertical = (typeof verticalNames)[number];

export const subverticalNames = Object.values(verticalTaxonomy).flat() as [
  (typeof verticalTaxonomy)[Vertical][number],
  ...(typeof verticalTaxonomy)[Vertical][number][],
];
export type Subvertical = (typeof subverticalNames)[number];

export function isValidVerticalClassification(
  vertical: string,
  subvertical: string,
): vertical is Vertical {
  if (!(vertical in verticalTaxonomy)) return false;
  return (verticalTaxonomy[vertical as Vertical] as readonly string[]).includes(
    subvertical,
  );
}

export function verticalTaxonomyPrompt() {
  return Object.entries(verticalTaxonomy)
    .map(
      ([vertical, subverticals]) => `${vertical}: ${subverticals.join("; ")}`,
    )
    .join("\n");
}

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
  coreBusiness: z.string().optional(),
  classificationReason: z.string().optional(),
  classificationSourceUrl: z.string().url().optional(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  size: z.string(),
  employees: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  criteriaMatch: z.enum(["compatible", "uncertain", "incompatible"]).optional(),
  criteriaReason: z.string().optional(),
  criteriaConfidence: z.number().int().min(0).max(100).optional(),
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
  evidenceDetails: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        statementKind: z.enum(["FACT", "INFERENCE", "UNKNOWN"]),
        claim: z.string(),
        sourceUrl: z.string().url(),
        sourceTitle: z.string().optional(),
        publisher: z.string().optional(),
        publishedAt: z.string().optional(),
        collectedAt: z.string(),
        excerpt: z.string().optional(),
        confidence: z.number().min(0).max(100),
        sourceQuality: z.number().min(0).max(100),
        freshnessScore: z.number().min(0).max(100),
        verified: z.boolean(),
        relevantSolutions: z.array(z.enum(solutions)),
      }),
    )
    .optional(),
  technicalSignals: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
        sourceUrl: z.string().url(),
        detectionMethod: z.string(),
        confidence: z.number().min(0).max(100),
        detectedAt: z.string(),
      }),
    )
    .optional(),
  digitalExposureScore: z.number().min(0).max(100).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  opportunityScore: z.number().min(0).max(100).optional(),
  scoringProfileVersion: z.string().optional(),
  qualificationStatus: z.enum(["NEEDS_RESEARCH", "READY"]).optional(),
  websiteSnapshots: z
    .array(
      z.object({
        url: z.string().url(),
        category: z.string(),
        contentHash: z.string(),
        fetchedAt: z.string(),
        change: z.enum(["NEW", "CHANGED", "UNCHANGED"]),
      }),
    )
    .optional(),
  evidenceAudit: z
    .object({
      status: z.string(),
      score: z.number(),
      issues: z.array(z.string()),
      auditedAt: z.string(),
    })
    .optional(),
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

export function dateInSaoPaulo(value: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
export type Company = z.infer<typeof companySchema>;

export const analyzedEvidenceSchema = z.object({
  kind: z.enum(["fact", "signal", "hypothesis"]),
  content: z.string().min(10).max(600),
  // OpenAI Structured Outputs rejects the JSON Schema `uri` format.
  // The repository still requires an exact match with an Exa result URL.
  sourceUrl: z.string().min(8).max(2048),
});

export const analyzedCompanySchema = z.object({
  name: z.string().min(2).max(200),
  tradeName: z.string().max(200),
  domain: z.string().min(3).max(253),
  vertical: z.enum(verticalNames),
  subsegment: z.enum(subverticalNames),
  coreBusiness: z.string().min(20).max(600),
  classificationReason: z.string().min(20).max(600),
  classificationSourceUrl: z.string().min(8).max(2048),
  city: z.string().max(100),
  state: z.string().max(100),
  country: z.string().min(2).max(100),
  size: z.string().min(2).max(100),
  employees: z.string().max(100),
  linkedinUrl: z.string().max(2048),
  criteriaMatch: z.enum(["compatible", "uncertain", "incompatible"]),
  criteriaReason: z.string().min(10).max(500),
  criteriaConfidence: z.number().int().min(0).max(100),
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

export function nameSimilarity(left: string, right: string) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

export function verifiedLinkedInCompanyUrl(
  candidate: string,
  sourceUrls: Iterable<string>,
): string | undefined {
  if (!candidate || !new Set(sourceUrls).has(candidate)) return undefined;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isLinkedIn =
      hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
    return url.protocol === "https:" &&
      isLinkedIn &&
      /^\/company\/[^/]+\/?$/i.test(url.pathname)
      ? candidate
      : undefined;
  } catch {
    return undefined;
  }
}

export function extractEmployeeLimit(criteria?: string) {
  if (!criteria) return undefined;
  const match = criteria.match(
    /(?:até|no máximo)\s+([\d.,]+)\s+funcionários?/i,
  );
  return match ? Number(match[1].replace(/[.,]/g, "")) : undefined;
}

export function extractEmployeeUpperBound(value?: string) {
  if (!value) return undefined;
  const numbers = Array.from(value.matchAll(/[\d.,]+/g), (match) =>
    Number(match[0].replace(/[.,]/g, "")),
  ).filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers) : undefined;
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
      (name.includes(other) ||
        other.includes(name) ||
        nameSimilarity(name, other) >= 0.85)
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

export const forbiddenBrandNames = new Set([
  "stone",
  "stone pagamentos",
  "pagseguro",
  "pagbank",
  "cielo",
  "getnet",
  "rede",
  "asaas",
  "infinitepay",
  "ebanx",
  "nubank",
  "picpay",
  "c6 bank",
  "c6",
  "banco inter",
  "inter & co",
  "inter co",
  "banco do brasil",
  "bradesco",
  "itau",
  "itau unibanco",
  "itaú",
  "santander",
  "btg",
  "btg pactual",
  "banco pan",
  "safra",
  "banco safra",
  "original",
  "banco original",
  "neon",
  "neon pagamentos",
  "mercado pago",
  "zoop",
  "stelo",
  "vindi",
  "iugu",
  "recargapay",
  "dock",
  "fitbank",
  "porto seguro",
  "sulamerica",
  "sulamérica",
  "tokio marine",
  "bradesco seguros",
  "xp",
  "xp investimentos",
  "rico",
  "clear corretora",
  "guide investimentos",
  "fleury",
  "laboratorio fleury",
  "laboratório fleury",
  "dasa",
  "rede d'or",
  "rede dor",
  "mater dei",
  "hapvida",
  "notredame intermedica",
  "notredame intermédica",
  "einstein",
  "sírio-libanês",
  "sirio libanes",
  "pague menos",
  "raiadrogasil",
  "droga raia",
  "drogasil",
  "eurofarma",
  "ems",
  "gerdau",
  "csn",
  "usiminas",
  "vale",
  "petrobras",
  "raizen",
  "raízen",
  "cosan",
  "jbs",
  "marfrig",
  "brf",
  "slc agricola",
  "slc agrícola",
  "mrv",
  "cyrela",
  "tupy",
  "weg",
  "claro",
  "vivo",
  "tim",
  "oi",
  "embratel",
  "algar telecom",
  "desktop internet",
  "brisanet",
  "unifique",
]);

export const forbiddenCoreBusinessRegexes: Array<{
  category: string;
  regex: RegExp;
}> = [
  {
    category: "Setor Financeiro / Meios de Pagamento / Fintechs",
    regex:
      /(?:adquirent|adquir[eê]ncia|maquininha|gateway de pagamento|processamento de pagamento|meios de pagamento|solu[cç][oõ]es de pagamento|servi[cç]os financeiro|opera[cç][oõ]es financeir|institui[cç][aã]o financeir|cart[aã]o de cr[eé]dito|cart[aã]o de d[eé]bito|\bbanco\b|\bbancos\b|\bbanking\b|\bfintech\b|\bfintechs\b|empr[eé]stimo|cr[eé]dito direto|cr[eé]dito pessoal|financiamento|factoring|antecipa[cç][aã]o de receb[ií]ve|seguradora|\bseguros\b|previd[eê]ncia privada|investimento|corretora de valores|asset management|fundo de investimento|carteira digital|\bwallet\b|criptomoeda|\bcrypto\b)/i,
  },
  {
    category: "Saúde / Hospitalar / Laboratórios Clínicos",
    regex:
      /(?:laborat[oó]rio de an[aá]lises|medicina diagn[oó]stica|\bhospital\b|\bhospitais\b|hospitalar|cl[ií]nica m[eé]dica|plano de sa[uú]de|ind[uú]stria farmac[eê]utica|rede de drogarias)/i,
  },
  {
    category: "Indústria Pesada / Siderurgia / Mineração / Agro / Construção",
    regex:
      /(?:siderurg|sider[uú]rg|minera[cç][aã]o de min[eé]rio|extra[cç][aã]o de petr[oó]leo|distribui[cç][aã]o de combust[ií]ve|usina de a[cç][uú]car e etanol|sucroalcooleir|frigor[ií]fico|abate de bovinos|constru[cç][aã]o civil|incorporadora imobili[aá]ria|fabrica[cç][aã]o de motores el[eé]tricos)/i,
  },
  {
    category: "Telecomunicações / Conectividade / Serviços Gerenciados de TI",
    regex:
      /(?:operadora de telefonia|telefonia m[oó]vel|servi[cç]o telef[oó]nico fixo|provedor de internet|banda larga|telecomunica[cç]|conectividade corporativa|servi[cç]os? gerenciados? de (?:ti|tecnologia|infraestrutura)|managed services provider|\bmsp\b|provedor(?:a)? de (?:servi[cç]os? de )?(?:nuvem|cloud)|cloud provider|data center as a service)/i,
  },
  {
    category: "Tecnologia / Consultoria de TI / Desenvolvimento de Software",
    regex:
      /(?:consultoria[^,.;]{0,50}(?:\bti\b|tecnologia|transforma[cç][aã]o digital|engenharia de software)|consultoria tecnol[oó]gica|technology consulting|servi[cç]os? de tecnologia da informa[cç][aã]o|empresa de tecnologia|outsourcing de (?:ti|tecnologia)|terceiriza[cç][aã]o de (?:ti|tecnologia)|f[aá]brica de software|software house|engenharia de software (?:para|e servi[cç]os)|desenvolvimento (?:sob medida|customizado) de software|integradora de sistemas|integra[cç][aã]o de sistemas (?:para|corporativos)|provedor(?:a)? de solu[cç][oõ]es? de (?:ti|tecnologia)|digital engineering services)/i,
  },
];

export function isForbiddenSectorCompany(company: {
  name?: string;
  tradeName?: string;
  domain?: string;
  coreBusiness?: string;
  description?: string;
  classificationReason?: string;
}): { forbidden: boolean; reason?: string } {
  const normName = normalizeName(company.name || "");
  const normTrade = normalizeName(company.tradeName || "");

  for (const brand of forbiddenBrandNames) {
    if (
      normName === brand ||
      normName.startsWith(`${brand} `) ||
      normTrade === brand ||
      normTrade.startsWith(`${brand} `)
    ) {
      return {
        forbidden: true,
        reason: `Marca explicitamente identificada como setor fora de escopo (${brand}).`,
      };
    }
  }

  const textToAnalyze = [
    company.name,
    company.tradeName,
    company.coreBusiness,
    company.description,
    company.classificationReason,
  ]
    .filter(Boolean)
    .join(" ");

  for (const { category, regex } of forbiddenCoreBusinessRegexes) {
    if (regex.test(textToAnalyze)) {
      return {
        forbidden: true,
        reason: `Atividade identificada como ${category}, violando a regra de core business das 9 verticais.`,
      };
    }
  }

  return { forbidden: false };
}
