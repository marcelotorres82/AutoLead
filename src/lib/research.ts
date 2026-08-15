import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns } from "@/db/schema";
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

const running = new Set<string>();

export function cronAuthorized(header: string | null, secret?: string) {
  return Boolean(secret && header === `Bearer ${secret}`);
}

function searchQueries() {
  const year = new Date().getFullYear();
  return verticalNames.map(
    (vertical) =>
      `Brasil ${vertical} empresa expansão digital e-commerce aplicativo marketplace portal cliente APIs cloud infraestrutura segurança vagas ${year}`,
  );
}

function configuredAiProvider() {
  if (env.GEMINI_API_KEY)
    return { provider: new GeminiAiProvider(), model: env.GEMINI_MODEL };
  if (env.OPENAI_API_KEY)
    return { provider: new OpenAiProvider(), model: env.OPENAI_MODEL };
  throw new Error("Nenhum provedor de IA configurado");
}

export async function runDailyResearch(
  date: string,
  demo = false,
  kind = "daily",
) {
  const lockKey = `${date}:${kind}`;
  if (running.has(lockKey))
    return { status: "duplicate" as const, date, created: 0 };
  running.add(lockKey);
  const started = Date.now();
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
    const ai = configuredAiProvider();
    const providerName = `tavily+${ai.provider.name}`;
    const [existing] = await db
      .select({ id: researchRuns.id, status: researchRuns.status })
      .from(researchRuns)
      .where(and(eq(researchRuns.runDate, date), eq(researchRuns.kind, kind)))
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
          model: ai.model,
          errors: [],
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
          model: ai.model,
        })
        .returning({ id: researchRuns.id });
      runId = run.id;
    }

    const tavily = new TavilySearchProvider();
    const searches = await Promise.allSettled(
      searchQueries().map((query) => tavily.search(query, 8)),
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

    const candidates = await ai.provider.analyzeBatch(uniqueResults);
    const persisted = await persistAnalyzedCompanies(
      candidates,
      uniqueResults,
      runId,
    );
    const durationMs = Date.now() - started;
    await db
      .update(researchRuns)
      .set({
        status: "completed",
        searchCount: searchQueries().length,
        durationMs,
        foundCount: persisted.created,
        duplicateCount: persisted.duplicateCount,
        errors,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));
    return {
      status: "completed" as const,
      date,
      created: persisted.created,
      duplicateCount: persisted.duplicateCount,
      durationMs,
      provider: providerName,
      estimatedCost: 0,
      errors,
      companies: await listCompanies(),
    };
  } catch (error) {
    console.error("[research] execution failed", {
      date,
      kind,
      error: error instanceof Error ? error.message : String(error),
    });
    const db = env.DATABASE_URL ? getDb() : null;
    if (db)
      await db
        .update(researchRuns)
        .set({
          status: "failed",
          durationMs: Date.now() - started,
          errors: [error instanceof Error ? error.message : String(error)],
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(researchRuns.runDate, date), eq(researchRuns.kind, kind)),
        );
    throw error;
  } finally {
    running.delete(lockKey);
  }
}
