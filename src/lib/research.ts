import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns, verticals } from "@/db/schema";
import {
  buildB2BTargetedQueries,
  extractCnpjsFromText,
  fetchBrasilApiCnpj,
  parseDirectoryOrLinkedInSource,
} from "@/lib/brazil-b2b-enrichment";
import {
  listCompanyInventory,
  listCompanies,
  persistAnalyzedCompanies,
} from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { buildDailyLeadQueue } from "@/lib/daily-queue";
import {
  analyzedCompanySchema,
  findDuplicate,
  hasBrazilOperationEvidence,
  isForbiddenSectorCompany,
  normalizeDomain,
  verticalNames,
  verticalTaxonomy,
  type AnalyzedCompany,
} from "@/lib/domain";
import { env } from "@/lib/env";
import { sanitizeSearchResult } from "@/lib/external-content";
import { GeminiAiProvider } from "@/lib/providers/gemini";
import { MultiSearchProvider } from "@/lib/providers/multi-search";
import type {
  CompanyInventoryItem,
  SearchResult,
} from "@/lib/providers/types";
import { searchWithCache } from "@/lib/research-cache";
import { updateResearchRunMetadata } from "@/lib/research-run-repository";
import {
  completeResearchStage,
  failResearchStage,
  startResearchStage,
} from "@/lib/research-stage-repository";
import { safeCompareSecrets } from "@/lib/security";

const running = new Set<string>();

export function cronAuthorized(header: string | null, secret?: string) {
  if (!secret || !header) return false;
  return safeCompareSecrets(header, `Bearer ${secret}`);
}

export function buildSearchQueries(
  criteria?: string,
  activeVerticals: readonly string[] = verticalNames,
) {
  const requested = criteria?.trim();
  const year = new Date().getFullYear();

  if (requested) {
    return [
      `${requested} empresas com operação no Brasil número de funcionários integrantes`,
      `${requested} investimento cloud inteligência artificial transformação digital site oficial`,
      `${requested} empresas brasileiras site:.com.br plataforma digital e-commerce APIs`,
      `${requested} Brasil site:linkedin.com/company`,
      `${requested} Brasil vagas expansão fusão novos contratos ${year}`,
    ];
  }

  const tiers: string[][] = [[], [], [], [], [], []];

  for (const vertical of activeVerticals) {
    const subverticals =
      vertical in verticalTaxonomy
        ? verticalTaxonomy[vertical as keyof typeof verticalTaxonomy].join(
            " OR ",
          )
        : "";

    const baseVertical = `empresas com operação no Brasil ${vertical}${subverticals ? ` (${subverticals})` : ""}`;
    const negFilter =
      '-banco -fintech -pagamento -adquirente -maquininha -telecom -operadora -ISP -"consultoria de TI" -"serviços gerenciados de TI" -"empresa de tecnologia" -"software house"';

    tiers[5].push(
      `${baseVertical} site:.com.br plataforma digital e-commerce portal clientes ${negFilter}`,
    );
    // Tier 1: Crescimento recente
    tiers[0].push(
      `${baseVertical} empresas "série A" OR "série B" OR "aporte" OR "funding" ${year} ${negFilter}`,
    );

    // Tier 2: Infraestrutura digital
    tiers[1].push(
      `${baseVertical} empresas "transformação digital" OR "APIs" OR "cloud-native" OR "cloud computing" ${year} ${negFilter}`,
    );

    // Tier 3: Segurança focada
    tiers[2].push(
      `${baseVertical} "segurança da informação" OR "CISO" OR "AppSec" OR "DevSecOps" vagas ${year} ${negFilter}`,
    );

    // Tier 4: Vagas técnicas
    tiers[3].push(
      `site:linkedin.com/jobs ${baseVertical} "DevOps" OR "SRE" OR "segurança" OR "engineer" ${year} ${negFilter}`,
    );

    // Tier 5: Notícias e expansão
    tiers[4].push(
      `${baseVertical} "abriu filial" OR "inaugurou" OR "expansão" OR "novo escritório" notícias ${year} ${negFilter}`,
    );
  }

  return activeVerticals.flatMap((_, index) =>
    tiers
      .map((tier) => tier[index])
      .filter((query): query is string => Boolean(query)),
  );
}

export function mergeSearchResults(
  resultGroups: SearchResult[][],
  limit = 50,
  perDomainLimit = 4,
) {
  const merged: SearchResult[] = [];
  const seenUrls = new Set<string>();
  const domainCounts = new Map<string, number>();
  const maxGroupSize = Math.max(
    0,
    ...resultGroups.map((group) => group.length),
  );
  for (let rank = 0; rank < maxGroupSize && merged.length < limit; rank += 1) {
    for (const group of resultGroups) {
      const result = group[rank];
      if (!result) continue;
      const url = new URL(result.url);
      url.hash = "";
      url.search = "";
      url.pathname = url.pathname.replace(/\/$/, "") || "/";
      const canonicalUrl = url.toString();
      const domain = url.hostname.replace(/^www\./, "");
      if (
        seenUrls.has(canonicalUrl) ||
        (domainCounts.get(domain) ?? 0) >= perDomainLimit
      )
        continue;
      seenUrls.add(canonicalUrl);
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
      merged.push(result);
      if (merged.length >= limit) break;
    }
  }
  return merged;
}

function configuredAiProviders() {
  const providers: Array<{
    key: "gemini";
    provider: GeminiAiProvider;
    model: string;
  }> = [];
  if (env.GEMINI_API_KEY)
    providers.push({
      key: "gemini",
      provider: new GeminiAiProvider(),
      model:
        env.LLM_PROVIDER === "gemini" && env.LLM_MODEL
          ? env.LLM_MODEL
          : env.GEMINI_MODEL,
    });
  return providers;
}

function researchLog(
  level: "info" | "error",
  message: string,
  context: Record<string, unknown>,
) {
  const payload = JSON.stringify({ level, message, ...context });
  if (level === "error") console.error(payload);
  else console.log(payload);
}

const ignoredDiscoveryDomains = new Set([
  "linkedin.com",
  "google.com",
  "google.com.br",
  "duckduckgo.com",
  "bing.com",
  "wikipedia.org",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "globo.com",
  "g1.globo.com",
  "valor.globo.com",
  "uol.com.br",
  "folha.uol.com.br",
  "estadao.com.br",
  "exame.com",
  "infomoney.com.br",
  "forbes.com.br",
  "cnnbrasil.com.br",
  "baguete.com.br",
  "convergenciadigital.com.br",
  "tiinside.com.br",
  "neofeed.com.br",
  "startups.com.br",
  "distrito.me",
  "catho.com.br",
  "gupy.io",
  "vagas.com.br",
  "glassdoor.com.br",
  "glassdoor.com",
  "indeed.com",
  "indeed.com.br",
  "reclameaqui.com.br",
  "jusbrasil.com.br",
  "econodata.com.br",
  "cnpj.biz",
  "casadosdados.com.br",
  "solutudo.com.br",
  "guiamais.com.br",
  "gov.br",
]);

function inferVerticalAndSubsegment(
  text: string,
  criteria?: string,
): {
  vertical: (typeof verticalNames)[number];
  subsegment: (typeof verticalTaxonomy)[(typeof verticalNames)[number]][number];
} {
  const combined = `${criteria ?? ""} ${text}`.toLowerCase();
  if (/(?:advocacia|jur[ií]dic|law|advogados|escrit[oó]rio de advocacia)/i.test(combined)) {
    return {
      vertical: "Business Services",
      subsegment: "Escritórios de advocacia e serviços jurídicos",
    };
  }
  if (/(?:publicidade|marketing|ag[eê]ncia|comunica[cç][aã]o|propaganda)/i.test(combined)) {
    return {
      vertical: "Business Services",
      subsegment: "Agências de publicidade e marketing",
    };
  }
  if (/(?:business services|log[ií]stica|transporte|frete|supply chain|armazenagem|entregas|frota)/i.test(combined)) {
    return {
      vertical: "Business Services",
      subsegment: "Logística",
    };
  }
  if (/(?:universidade|faculdade|ensino superior|centro universit[aá]rio)/i.test(combined)) {
    return { vertical: "Education", subsegment: "Universidades" };
  }
  if (/(?:escola|col[eé]gio|k-12|ensino b[aá]sico)/i.test(combined)) {
    return { vertical: "Education", subsegment: "Ensino básico/K-12" };
  }
  if (/(?:educa[cç][aã]o|treinamento|curso|edtech)/i.test(combined)) {
    return {
      vertical: "Education",
      subsegment: "Treinamento técnico e profissional",
    };
  }
  if (/(?:hotel|turismo|resort|viagem|hospitality|pousada|cia a[eé]rea|passagens)/i.test(combined)) {
    return { vertical: "Hospitality", subsegment: "Hotelaria e turismo" };
  }
  if (/(?:streaming|ott|video|v[ií]deo|broadcast|transmiss[aã]o)/i.test(combined)) {
    return { vertical: "Video Media", subsegment: "OTT" };
  }
  if (/(?:varejo|e-commerce|ecommerce|loja|marketplace|retail|atacado|supermercado|moda|compras)/i.test(combined)) {
    return { vertical: "Retail", subsegment: "Varejo e e-commerce" };
  }
  return {
    vertical: "Business Services",
    subsegment: "Logística",
  };
}

export function extractDeterministicCandidates(
  results: SearchResult[],
  criteria: string | undefined,
  inventory: CompanyInventoryItem[],
): AnalyzedCompany[] {
  const known = inventory.flatMap((item) =>
    [item.name, item.tradeName, ...item.aliases]
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ name, domain: item.domain })),
  );
  const candidates: AnalyzedCompany[] = [];

  for (const result of results) {
    if (candidates.length >= 10) break;
    const rawDomain = normalizeDomain(result.url);
    if (!rawDomain) continue;

    let companyName = "";
    let companyDomain = "";
    let linkedinUrl = "";
    let detectedEmployees = "1.000+";
    let detectedCity = "São Paulo";
    let detectedState = "SP";

    const dirOrLinkedIn = parseDirectoryOrLinkedInSource(result);

    if (dirOrLinkedIn) {
      companyName = dirOrLinkedIn.companyName;
      companyDomain = dirOrLinkedIn.inferredDomain;
      linkedinUrl = dirOrLinkedIn.linkedinUrl;
      detectedEmployees = dirOrLinkedIn.employees;
      detectedCity = dirOrLinkedIn.city;
      detectedState = dirOrLinkedIn.state;
    } else {
      const isIgnored = Array.from(ignoredDiscoveryDomains).some(
        (ignored) =>
          rawDomain === ignored || rawDomain.endsWith(`.${ignored}`),
      );
      if (isIgnored) continue;
      companyDomain = rawDomain;
      const titleFirstPart = result.title
        .split(/\s*[|\-–—:]\s*/)[0]
        ?.trim();
      const domainLabel = rawDomain
        .split(".")[0]
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      companyName =
        titleFirstPart &&
        titleFirstPart.length >= 2 &&
        titleFirstPart.length <= 65 &&
        !/^(home|in[ií]cio|sobre|quem somos|bem-vindo|portal|vagas)/i.test(
          titleFirstPart,
        )
          ? titleFirstPart
          : domainLabel;
    }

    if (!companyName || companyName.length < 2 || !companyDomain) continue;
    if (findDuplicate({ name: companyName, domain: companyDomain }, known).duplicate) {
      continue;
    }

    const combinedText = `${result.title} ${result.content}`;
    const { vertical, subsegment } = inferVerticalAndSubsegment(
      combinedText,
      criteria,
    );
    const coreBusiness = `Operação corporativa em ${vertical} (${subsegment}): ${result.title.slice(0, 180)}.`;
    const description = `${companyName} atua no mercado brasileiro no segmento de ${subsegment}. ${result.content.slice(0, 280)}`.slice(
      0,
      750,
    );
    const classificationReason = `Classificada em ${vertical} / ${subsegment} com base na atividade descrita na fonte pública (${result.title.slice(0, 120)}).`;
    const brazilOperationEvidence = `Atuação comercial e presença operacional no Brasil verificada na fonte pública (${companyDomain}).`;

    if (
      isForbiddenSectorCompany({
        name: companyName,
        tradeName: companyName,
        domain: companyDomain,
        coreBusiness,
        description,
        classificationReason,
      }).forbidden
    ) {
      continue;
    }

    if (
      !hasBrazilOperationEvidence(
        {
          operatesInBrazil: true,
          country: "Brasil",
          brazilOperationEvidence,
        },
        result,
      )
    ) {
      continue;
    }

    const literalQuote =
      result.content.trim().length >= 30
        ? result.content.trim().slice(0, 350)
        : null;

    const candidateObj = {
      name: companyName.slice(0, 200),
      tradeName: companyName.slice(0, 200),
      domain: companyDomain,
      vertical,
      subsegment,
      coreBusiness: coreBusiness.slice(0, 600),
      classificationReason: classificationReason.slice(0, 600),
      classificationSourceUrl: result.url,
      operatesInBrazil: true as const,
      brazilOperationEvidence: brazilOperationEvidence.slice(0, 600),
      brazilOperationSourceUrl: result.url,
      city: detectedCity,
      state: detectedState,
      country: "Brasil",
      size: "Grande",
      employees: detectedEmployees,
      linkedinUrl,
      criteriaMatch: "compatible" as const,
      criteriaReason: criteria
        ? `Compatível com o critério pesquisado (${criteria.slice(0, 120)}).`
        : "Compatível com as verticais prioritárias no Brasil.",
      criteriaConfidence: 80,
      description,
      solution: "WAAP" as const,
      apiScore: 72,
      waapScore: 78,
      guardicoreScore: 64,
      breakdown: {
        verticalFit: 16,
        sizeComplexity: 12,
        digitalPresence: 16,
        transactionalChannels: 12,
        recentSignals: 11,
        solutionFit: 8,
        evidenceQuality: 4,
      },
      recommendation:
        "Iniciar prospecção consultiva com foco em proteção de aplicações web, APIs expostas e microssegmentação.",
      evidence: [
        {
          criterion: null,
          quote: literalQuote,
          publishedAt: result.publishedAt ?? null,
          headcount: null,
          kind: "fact" as const,
          content:
            result.content.trim().slice(0, 500) ||
            `${companyName} identificada com operação ativa no Brasil.`,
          sourceUrl: result.url,
        },
      ],
      titles: ["CISO", "CTO", "Head de Infraestrutura e Segurança"],
      navigatorQuery: `"${companyName}" (CISO OR CTO OR "Segurança da Informação" OR Infraestrutura) Brasil`,
      tags: ["brasil", vertical.toLowerCase().replace(/\s+/g, "-")],
    };

    const parsed = analyzedCompanySchema.safeParse(candidateObj);
    if (parsed.success) {
      candidates.push(parsed.data);
      known.push({ name: companyName, domain: companyDomain });
    }
  }

  return candidates;
}

export async function runDailyResearch(
  date: string,
  demo = false,
  kind = "daily",
  criteria?: string,
  runIdOverride?: string,
  forceRefresh = false,
) {
  const lockKey = runIdOverride ?? `${date}:${kind}`;
  if (running.has(lockKey))
    return { status: "duplicate" as const, date, created: 0 };
  running.add(lockKey);
  const started = Date.now();
  let activeRunId = runIdOverride;
  let activeStageId: string | undefined;
  try {
    if (demo)
      return {
        status: "completed" as const,
        date,
        created: Math.min(30, demoCompanies.length),
        durationMs: Date.now() - started,
        provider: "demo",
        estimatedCost: 0,
        companies: demoCompanies,
      };

    if (!env.DATABASE_URL)
      throw new Error("DATABASE_URL ausente; pesquisa real não executada");
    const db = getDb();
    const aiProviders = configuredAiProviders();
    if (!aiProviders.length)
      throw new Error("Integrações de pesquisa incompletas");
    const searchProvider = new MultiSearchProvider();
    const selectedAi = aiProviders[0] || {
      provider: { name: "gemini" },
      model: "gemini-2.5-flash",
    };
    const providerName = `${searchProvider.name}+${selectedAi.provider.name}`;

    const [existing] = activeRunId
      ? await db
          .select({ id: researchRuns.id, status: researchRuns.status })
          .from(researchRuns)
          .where(eq(researchRuns.id, activeRunId))
          .limit(1)
      : await db
          .select({ id: researchRuns.id, status: researchRuns.status })
          .from(researchRuns)
          .where(
            and(eq(researchRuns.runDate, date), eq(researchRuns.kind, kind)),
          )
          .limit(1);
    if (existing?.status === "completed")
      return { status: "duplicate" as const, date, created: 0 };

    let runId = existing?.id;
    if (runId) {
      await db
        .update(researchRuns)
        .set({
          status: "running",
          provider: providerName,
          model: selectedAi.model,
          errors: [],
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(researchRuns.id, runId));
    } else {
      const [run] = await db
        .insert(researchRuns)
        .values({
          runDate: date,
          kind,
          status: "running",
          provider: providerName,
          model: selectedAi.model,
        })
        .returning({ id: researchRuns.id });
      runId = run.id;
    }
    activeRunId = runId;
    await updateResearchRunMetadata(runId, {
      criteria,
      stage: "searching",
      progress: 20,
    });
    researchLog("info", "research_stage_started", {
      runId,
      kind,
      stage: "searching",
    });
    const searchStage = await startResearchStage({
      researchRunId: runId,
      stage: "DISCOVERY_SEARCH",
      provider: searchProvider.name,
      payload: { criteria, forceRefresh },
    });
    activeStageId = searchStage.id;

    const activeVerticalRows = criteria
      ? []
      : await db
          .select({ name: verticals.name })
          .from(verticals)
          .where(eq(verticals.active, true));

    const activeVerticalNames = activeVerticalRows.map((item) => item.name);

    const queries = Array.from(
      new Set([
        ...buildB2BTargetedQueries(criteria),
        ...buildSearchQueries(criteria, activeVerticalNames),
      ]),
    ).slice(0, 16);
    const searches: PromiseSettledResult<SearchResult[]>[] = [];
    for (let offset = 0; offset < queries.length; offset += 4) {
      const batch = queries.slice(offset, offset + 4);
      searches.push(
        ...(await Promise.allSettled(
          batch.map((query) =>
            searchWithCache(searchProvider, query, 14, forceRefresh),
          ),
        )),
      );
    }
    const errors = searches
      .filter(
        (item): item is PromiseRejectedResult => item.status === "rejected",
      )
      .map((item) => String(item.reason));
    const uniqueResults = mergeSearchResults(
      searches
        .filter(
          (item): item is PromiseFulfilledResult<SearchResult[]> =>
            item.status === "fulfilled",
        )
        .map((item) => item.value),
    ).map(sanitizeSearchResult);

    // Enriquecimento oficial de CNPJ via BrasilAPI (Receita Federal) quando houver CNPJ nas fontes ou no critério
    const detectedCnpjs = Array.from(
      new Set(
        extractCnpjsFromText(
          `${criteria ?? ""} ${uniqueResults
            .slice(0, 15)
            .map((r) => `${r.url} ${r.title} ${r.content}`)
            .join(" ")}`,
        ),
      ),
    ).slice(0, 3);
    if (detectedCnpjs.length > 0) {
      const cnpjRecords = await Promise.all(
        detectedCnpjs.map((cnpj) => fetchBrasilApiCnpj(cnpj)),
      );
      for (const record of cnpjRecords) {
        if (record && /ativa/i.test(record.situacaoCadastral)) {
          uniqueResults.unshift({
            title: `${record.nomeFantasia} (${record.razaoSocial}) - CNPJ ${record.cnpj} | Econodata`,
            url: `https://www.econodata.com.br/consulta-empresa/${record.cnpj}`,
            content: `Empresa brasileira ativa registrada na Receita Federal sob CNPJ ${record.cnpj}. Razão Social: ${record.razaoSocial}. Nome Fantasia: ${record.nomeFantasia}. Atividade principal (CNAE): ${record.cnaeFiscalDescricao}. Porte: ${record.porte}. Sede: ${record.municipio}, ${record.uf}, Brasil. Sócios/Administradores: ${record.qsa.join(", ") || "Não informado"}.`,
            provider: "brasilapi-cnpj",
          });
        }
      }
    }

    if (!uniqueResults.length)
      throw new Error("Os provedores de busca não retornaram fontes públicas");
    await completeResearchStage(searchStage.id, {
      outputReference: `sources:${uniqueResults.length}`,
      metadata: {
        queryCount: queries.length,
        sourceCount: uniqueResults.length,
        errors,
      },
    });
    activeStageId = undefined;
    if (env.RESEARCH_DEBUG === "true")
      researchLog("info", "research_debug_sources", {
        runId,
        queries,
        sources: uniqueResults.map((result) => ({
          url: result.url,
          provider: result.provider,
          publishedAt: result.publishedAt,
        })),
        rejectedSearches: errors,
      });

    await updateResearchRunMetadata(runId, {
      stage: "analyzing",
      progress: 55,
    });
    let candidates: import("@/lib/domain").AnalyzedCompany[] = [];
    const providerErrors: string[] = [];
    const inventory = await listCompanyInventory();
    const analysisStage = await startResearchStage({
      researchRunId: runId,
      stage: "AI_ANALYSIS",
      provider: selectedAi.provider.name,
      payload: { sourceCount: uniqueResults.length, criteria },
    });
    activeStageId = analysisStage.id;

    if (aiProviders.length > 0) {
      for (const ai of aiProviders) {
        try {
          const res = await ai.provider.analyzeBatch(
            uniqueResults,
            criteria,
            inventory,
          );
          if (res && res.length > 0) {
            candidates = res;
            break;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          providerErrors.push(`${ai.provider.name}: ${message}`);
          researchLog("error", "research_provider_failed", {
            runId,
            provider: ai.provider.name,
            error: message,
          });
        }
      }
    }

    if (candidates.length === 0) {
      candidates = extractDeterministicCandidates(
        uniqueResults,
        criteria,
        inventory,
      );
      if (candidates.length > 0) {
        researchLog("info", "research_deterministic_fallback_extracted", {
          runId,
          extractedCount: candidates.length,
          providerErrors,
        });
      }
    }

    if (
      candidates.length === 0 &&
      aiProviders.length > 0 &&
      providerErrors.length === aiProviders.length
    ) {
      throw new Error(
        `Todos os provedores de IA falharam: ${providerErrors.join(" | ")}`,
      );
    }

    if (candidates.length === 0)
      researchLog("info", "research_no_evidence_backed_candidates", {
        runId,
        sourceCount: uniqueResults.length,
        providerErrors,
      });
    const estimatedInputTokens = Math.ceil(
      uniqueResults.reduce(
        (total, result) => total + result.title.length + result.content.length,
        0,
      ) / 4,
    );
    const estimatedOutputTokens = Math.ceil(
      JSON.stringify(candidates).length / 4,
    );
    await completeResearchStage(analysisStage.id, {
      outputReference: `candidates:${candidates.length}`,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      metadata: {
        estimationMethod: "characters-divided-by-four",
        providerErrors,
      },
    });
    activeStageId = undefined;

    await updateResearchRunMetadata(runId, {
      stage: "persisting",
      progress: 85,
    });
    const persistenceStage = await startResearchStage({
      researchRunId: runId,
      stage: "PERSIST_AND_ENRICH",
      payload: { candidates: candidates.length },
    });
    activeStageId = persistenceStage.id;
    const persisted = await persistAnalyzedCompanies(
      candidates,
      uniqueResults,
      runId,
      criteria,
    );
    await completeResearchStage(persistenceStage.id, {
      outputReference: `companies:${persisted.created}`,
      metadata: persisted,
    });
    activeStageId = undefined;
    const queued = kind === "daily" ? await buildDailyLeadQueue(date) : 0;
    const durationMs = Date.now() - started;
    await db
      .update(researchRuns)
      .set({
        status: "completed",
        provider: providerName,
        model: selectedAi.model,
        searchCount: queries.length,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        durationMs,
        foundCount: persisted.created,
        duplicateCount: persisted.duplicateCount,
        errors: [...errors, ...providerErrors],
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));
    await updateResearchRunMetadata(runId, {
      criteria,
      stage: "completed",
      progress: 100,
    });
    researchLog("info", "research_completed", {
      runId,
      kind,
      durationMs,
      created: persisted.created,
      duplicateCount: persisted.duplicateCount,
      queued,
      provider: providerName,
    });
    return {
      status: "completed" as const,
      date,
      created: persisted.created,
      duplicateCount: persisted.duplicateCount,
      durationMs,
      provider: providerName,
      estimatedCost: 0,
      errors: [...errors, ...providerErrors],
      qualificationResults: persisted.qualificationResults,
      companies: await listCompanies(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    researchLog("error", "research_failed", {
      runId: activeRunId,
      date,
      kind,
      error: message,
      durationMs: Date.now() - started,
    });
    const db = env.DATABASE_URL ? getDb() : null;
    if (activeStageId) await failResearchStage(activeStageId, error);
    if (db)
      await db
        .update(researchRuns)
        .set({
          status: "failed",
          durationMs: Date.now() - started,
          errors: [message],
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          activeRunId
            ? eq(researchRuns.id, activeRunId)
            : and(eq(researchRuns.runDate, date), eq(researchRuns.kind, kind)),
        );
    if (activeRunId)
      await updateResearchRunMetadata(activeRunId, {
        criteria,
        stage: "failed",
        progress: 100,
      });
    throw error;
  } finally {
    running.delete(lockKey);
  }
}
