import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns, verticals } from "@/db/schema";
import {
  listCompanies,
  persistAnalyzedCompanies,
} from "@/lib/company-repository";
import { demoCompanies, verticalNames } from "@/lib/demo-data";
import { env } from "@/lib/env";
import { GeminiAiProvider } from "@/lib/providers/gemini";
import { OpenAiProvider } from "@/lib/providers/openai";
import { TavilySearchProvider } from "@/lib/providers/tavily";
import type { SearchResult } from "@/lib/providers/types";
import { updateResearchRunMetadata } from "@/lib/research-run-repository";

const running = new Set<string>();

export function cronAuthorized(header: string | null, secret?: string) {
  return Boolean(secret && header === `Bearer ${secret}`);
}

export function buildSearchQueries(
  criteria?: string,
  activeVerticals = verticalNames,
) {
  const requested = criteria?.trim();
  if (requested)
    return [
      `${requested} Brasil empresas`,
      `${requested} Brasil site oficial empresa`,
      `${requested} Brasil site:linkedin.com/company`,
      `${requested} Brasil notícias vagas expansão`,
    ];
  const year = new Date().getFullYear();
  return activeVerticals.map(
    (vertical) =>
      `Brasil ${vertical} empresa expansão digital e-commerce aplicativo marketplace portal cliente APIs cloud infraestrutura segurança vagas ${year}`,
  );
}

function configuredAiProviders() {
  const providers = [];
  if (env.GEMINI_API_KEY)
    providers.push({
      provider: new GeminiAiProvider(),
      model: env.GEMINI_MODEL,
    });
  if (env.OPENAI_API_KEY)
    providers.push({ provider: new OpenAiProvider(), model: env.OPENAI_MODEL });
  if (!providers.length) throw new Error("Nenhum provedor de IA configurado");
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

export async function runDailyResearch(
  date: string,
  demo = false,
  kind = "daily",
  criteria?: string,
  runIdOverride?: string,
) {
  const lockKey = runIdOverride ?? `${date}:${kind}`;
  if (running.has(lockKey))
    return { status: "duplicate" as const, date, created: 0 };
  running.add(lockKey);
  const started = Date.now();
  let activeRunId = runIdOverride;
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
    if (
      !env.DATABASE_URL ||
      !env.TAVILY_API_KEY ||
      (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY)
    )
      throw new Error("Integrações de pesquisa incompletas");

    const db = getDb();
    const aiProviders = configuredAiProviders();
    let selectedAi = aiProviders[0];
    let providerName = `tavily+${selectedAi.provider.name}`;
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

    const activeVerticalRows = criteria
      ? []
      : await db
          .select({ name: verticals.name })
          .from(verticals)
          .where(eq(verticals.active, true));
    const queries = buildSearchQueries(
      criteria,
      activeVerticalRows.map((item) => item.name),
    );
    if (!queries.length)
      throw new Error("Nenhuma vertical de pesquisa está ativa");
    const tavily = new TavilySearchProvider();
    const searches = await Promise.allSettled(
      queries.map((query) => tavily.search(query, 8)),
    );
    const errors = searches
      .filter(
        (item): item is PromiseRejectedResult => item.status === "rejected",
      )
      .map((item) => String(item.reason));
    const uniqueResults = Array.from(
      new Map(
        searches
          .filter(
            (item): item is PromiseFulfilledResult<SearchResult[]> =>
              item.status === "fulfilled",
          )
          .flatMap((item) => item.value)
          .map((item) => [item.url, item]),
      ).values(),
    ).slice(0, 50);
    if (!uniqueResults.length)
      throw new Error("Tavily não retornou fontes públicas");

    await updateResearchRunMetadata(runId, {
      stage: "analyzing",
      progress: 55,
    });
    let candidates;
    const providerErrors: string[] = [];
    for (const ai of aiProviders) {
      try {
        candidates = await ai.provider.analyzeBatch(uniqueResults, criteria);
        selectedAi = ai;
        providerName = `tavily+${ai.provider.name}`;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        providerErrors.push(`${ai.provider.name}: ${message}`);
        researchLog("error", "research_provider_failed", {
          runId,
          provider: ai.provider.name,
          error: message,
        });
      }
    }
    if (!candidates) throw new Error(providerErrors.join(" | "));
    await updateResearchRunMetadata(runId, {
      stage: "persisting",
      progress: 85,
    });
    const persisted = await persistAnalyzedCompanies(
      candidates,
      uniqueResults,
      runId,
      criteria,
    );
    const durationMs = Date.now() - started;
    await db
      .update(researchRuns)
      .set({
        status: "completed",
        provider: providerName,
        model: selectedAi.model,
        searchCount: queries.length,
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
