import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns, verticals } from "@/db/schema";
import {
  listCompanyInventory,
  listCompanies,
  persistAnalyzedCompanies,
} from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { buildDailyLeadQueue } from "@/lib/daily-queue";
import { verticalNames, verticalTaxonomy } from "@/lib/domain";
import { env } from "@/lib/env";
import { sanitizeSearchResult } from "@/lib/external-content";
import { ClaudeAiProvider } from "@/lib/providers/claude";
import { GeminiAiProvider } from "@/lib/providers/gemini";
import { ExaSearchProvider } from "@/lib/providers/exa";
import { OpenAiProvider } from "@/lib/providers/openai";
import type { SearchResult } from "@/lib/providers/types";
import { searchWithCache } from "@/lib/research-cache";
import { updateResearchRunMetadata } from "@/lib/research-run-repository";
import {
  completeResearchStage,
  failResearchStage,
  startResearchStage,
} from "@/lib/research-stage-repository";

const running = new Set<string>();

export function cronAuthorized(header: string | null, secret?: string) {
  return Boolean(secret && header === `Bearer ${secret}`);
}

export function buildSearchQueries(
  criteria?: string,
  activeVerticals: readonly string[] = verticalNames,
) {
  const requested = criteria?.trim();
  const year = new Date().getFullYear();

  if (requested) {
    return [
      `${requested} empresas com operação no Brasil`,
      `${requested} "atua no Brasil" OR "opera no Brasil" site oficial`,
      `${requested} Brasil site:linkedin.com/company`,
      `${requested} Brasil escritório lojas vagas expansão`,
    ];
  }

  const tiers: string[][] = [[], [], [], [], []];

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

  return tiers.flat();
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
    key: "gemini" | "anthropic" | "openai";
    provider: GeminiAiProvider | ClaudeAiProvider | OpenAiProvider;
    model: string;
  }> = [];
  if (env.ANTHROPIC_API_KEY)
    providers.push({
      key: "anthropic",
      provider: new ClaudeAiProvider(),
      model:
        env.LLM_PROVIDER === "anthropic" && env.LLM_MODEL
          ? env.LLM_MODEL
          : env.ANTHROPIC_MODEL,
    });
  if (env.GEMINI_API_KEY)
    providers.push({
      key: "gemini",
      provider: new GeminiAiProvider(),
      model:
        env.LLM_PROVIDER === "gemini" && env.LLM_MODEL
          ? env.LLM_MODEL
          : env.GEMINI_MODEL,
    });
  if (env.OPENAI_API_KEY)
    providers.push({
      key: "openai",
      provider: new OpenAiProvider(),
      model:
        env.LLM_PROVIDER === "openai" && env.LLM_MODEL
          ? env.LLM_MODEL
          : env.OPENAI_MODEL,
    });
  return env.LLM_PROVIDER === "auto"
    ? providers
    : providers.sort((a) => (a.key === env.LLM_PROVIDER ? -1 : 1));
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
    if (demo || !env.DATABASE_URL)
      return {
        status: "completed" as const,
        date,
        created: Math.min(30, demoCompanies.length),
        durationMs: Date.now() - started,
        provider: "demo",
        estimatedCost: 0,
        companies: demoCompanies,
      };

    const db = getDb();
    const aiProviders = configuredAiProviders();
    if (!env.EXA_API_KEY || !aiProviders.length)
      throw new Error("Integrações de pesquisa incompletas");
    const selectedAi = aiProviders[0] || {
      provider: { name: "multi-ai (gemini+chatgpt+perplexity)" },
      model: "gemini-flash · gpt-5 · perplexity-sonar",
    };
    const providerName = `exa+${selectedAi.provider.name}`;

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
      provider: "exa",
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

    const queries = buildSearchQueries(criteria, activeVerticalNames).slice(
      0,
      16,
    );
    if (!env.EXA_API_KEY)
      throw new Error("Integrações de pesquisa incompletas");
    const searchProvider = new ExaSearchProvider();
    const searches: PromiseSettledResult<SearchResult[]>[] = [];
    for (let offset = 0; offset < queries.length; offset += 4) {
      const batch = queries.slice(offset, offset + 4);
      searches.push(
        ...(await Promise.allSettled(
          batch.map((query) =>
            searchWithCache(searchProvider, query, 12, forceRefresh),
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
    if (!uniqueResults.length)
      throw new Error("Exa não retornou fontes públicas");
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
