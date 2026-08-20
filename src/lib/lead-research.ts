import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns } from "@/db/schema";
import { env } from "@/lib/env";
import { buildLeadSearchQueries } from "@/lib/lead-domain";
import {
  getLeadResearchContexts,
  listExistingLeadIdentities,
  persistResearchedLeads,
} from "@/lib/lead-repository";
import { GeminiAiProvider } from "@/lib/providers/gemini";
import { OpenAiProvider } from "@/lib/providers/openai";
import { TavilySearchProvider } from "@/lib/providers/tavily";
import type { AiProvider, SearchResult } from "@/lib/providers/types";
import { mergeSearchResults } from "@/lib/research";
import { updateResearchRunMetadata } from "@/lib/research-run-repository";

function configuredAiProviders(): Array<{
  provider: AiProvider;
  model: string;
}> {
  const providers: Array<{ provider: AiProvider; model: string }> = [];
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

export async function runLeadResearch(runId: string, companyId: string) {
  if (!env.DATABASE_URL || !env.TAVILY_API_KEY)
    throw new Error("Integrações de pesquisa incompletas");
  const started = Date.now();
  const db = getDb();
  try {
    const [context] = await getLeadResearchContexts([companyId]);
    if (!context) throw new Error("Empresa não encontrada");
    if (!context.approved)
      throw new Error("A empresa precisa estar aprovada para pesquisar leads");
    const aiProviders = configuredAiProviders();
    let selectedAi = aiProviders[0];
    let providerName = `tavily+${selectedAi.provider.name}`;
    await db
      .update(researchRuns)
      .set({
        status: "running",
        provider: providerName,
        model: selectedAi.model,
        errors: [],
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));
    await updateResearchRunMetadata(runId, {
      stage: "searching_leads",
      progress: 20,
    });

    const queries = buildLeadSearchQueries(context);
    const tavily = new TavilySearchProvider();
    const searches = await Promise.allSettled(
      queries.map((query) => tavily.search(query, 12)),
    );
    const errors = searches
      .filter(
        (item): item is PromiseRejectedResult => item.status === "rejected",
      )
      .map((item) => String(item.reason));
    const results = mergeSearchResults(
      searches
        .filter(
          (item): item is PromiseFulfilledResult<SearchResult[]> =>
            item.status === "fulfilled",
        )
        .map((item) => item.value),
      50,
      6,
    );
    if (!results.length)
      throw new Error("Tavily não retornou fontes de pessoas");

    await updateResearchRunMetadata(runId, {
      stage: "analyzing_leads",
      progress: 60,
    });
    const existing = await listExistingLeadIdentities(companyId);
    let candidates;
    const providerErrors: string[] = [];
    for (const ai of aiProviders) {
      try {
        candidates = await ai.provider.analyzeLeads(results, context, existing);
        selectedAi = ai;
        providerName = `tavily+${ai.provider.name}`;
        break;
      } catch (error) {
        providerErrors.push(
          `${ai.provider.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (!candidates) throw new Error(providerErrors.join(" | "));

    await updateResearchRunMetadata(runId, {
      stage: "persisting_leads",
      progress: 88,
    });
    const persisted = await persistResearchedLeads(
      context,
      candidates,
      results,
      runId,
    );
    const durationMs = Date.now() - started;
    await db
      .update(researchRuns)
      .set({
        status: "completed",
        provider: providerName,
        model: selectedAi.model,
        searchCount: queries.length,
        foundCount: persisted.created,
        duplicateCount: persisted.duplicateCount,
        errors: [...errors, ...providerErrors],
        durationMs,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));
    await updateResearchRunMetadata(runId, {
      stage: "completed",
      progress: 100,
    });
    return persisted;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(researchRuns)
      .set({
        status: "failed",
        errors: [message],
        durationMs: Date.now() - started,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));
    await updateResearchRunMetadata(runId, {
      stage: "failed",
      progress: 100,
    });
    throw error;
  }
}
