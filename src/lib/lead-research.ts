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
import { ClaudeAiProvider } from "@/lib/providers/claude";
import { GeminiAiProvider } from "@/lib/providers/gemini";
import { ExaSearchProvider } from "@/lib/providers/exa";
import { OpenAiProvider } from "@/lib/providers/openai";
import type { AiProvider, SearchResult } from "@/lib/providers/types";
import { mergeSearchResults } from "@/lib/research";
import { updateResearchRunMetadata } from "@/lib/research-run-repository";

function configuredAiProviders(): Array<{
  provider: AiProvider;
  model: string;
}> {
  const providers: Array<{ provider: AiProvider; model: string }> = [];
  if (env.ANTHROPIC_API_KEY)
    providers.push({
      provider: new ClaudeAiProvider(),
      model: env.ANTHROPIC_MODEL,
    });
  if (env.GEMINI_API_KEY)
    providers.push({
      provider: new GeminiAiProvider(),
      model: env.GEMINI_MODEL,
    });
  if (env.OPENAI_API_KEY)
    providers.push({ provider: new OpenAiProvider(), model: env.OPENAI_MODEL });
  return providers;
}

export async function runLeadResearch(runId: string, companyId: string) {
  const started = Date.now();
  const db = getDb();
  try {
    if (
      !env.DATABASE_URL ||
      !env.EXA_API_KEY ||
      (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY)
    )
      throw new Error("Integrações de pesquisa incompletas");
    const [context] = await getLeadResearchContexts([companyId]);
    if (!context) throw new Error("Empresa não encontrada");
    if (!context.approved)
      throw new Error("A empresa precisa estar aprovada para pesquisar leads");

    const aiProviders = configuredAiProviders();
    const providerName = `exa+${aiProviders[0]?.provider.name ?? "sem-ia"}`;
    const modelName =
      aiProviders.length > 0
        ? aiProviders[0].model
        : "gemini-flash · gpt-5 · perplexity-sonar";

    await db
      .update(researchRuns)
      .set({
        status: "running",
        provider: providerName,
        model: modelName,
        errors: [],
        updatedAt: new Date(),
      })
      .where(eq(researchRuns.id, runId));

    await updateResearchRunMetadata(runId, {
      stage: "searching_leads",
      progress: 20,
    });

    const queries = buildLeadSearchQueries(context);
    const searchProvider = new ExaSearchProvider();
    const searches = await Promise.allSettled(
      queries.map((query) => searchProvider.search(query, 12)),
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
    if (!results.length) throw new Error("Exa não retornou fontes de pessoas");

    await updateResearchRunMetadata(runId, {
      stage: "analyzing_leads",
      progress: 60,
    });

    const existing = await listExistingLeadIdentities(companyId);
    let candidates: import("@/lib/lead-domain").AnalyzedLead[] = [];
    const providerErrors: string[] = [];

    // 1. Tentar executar IAs com chave configurada
    for (const ai of aiProviders) {
      try {
        const aiLeads = await ai.provider.analyzeLeads(
          results,
          context,
          existing,
        );
        if (aiLeads && aiLeads.length > 0) {
          candidates = [...candidates, ...aiLeads];
        }
      } catch (error) {
        providerErrors.push(
          `${ai.provider.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

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
        model: modelName,
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
