import { FatalError, RetryableError } from "workflow";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns } from "@/db/schema";
import { withResearchStage } from "@/lib/research-stage-repository";
import { refreshCompanyWebsiteIntelligence } from "@/lib/website-intelligence-repository";

export async function refreshCompanyWebsiteStep(
  companyId: string,
  runId: string,
) {
  "use step";
  try {
    return await withResearchStage(
      {
        researchRunId: runId,
        companyId,
        stage: "WEBSITE_REFRESH",
        provider: "deterministic-web",
        payload: { companyId, forceRefresh: true },
      },
      () => refreshCompanyWebsiteIntelligence(companyId, runId),
      (result) => ({
        outputReference: `website:${companyId}`,
        metadata: {
          pages: result.pages,
          signals: result.signals,
          changes: result.changes,
        },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/sem domínio|privado|Protocolo|inválido|não permitido/i.test(message))
      throw new FatalError(message);
    throw new RetryableError(message, { retryAfter: "30s" });
  }
}

refreshCompanyWebsiteStep.maxRetries = 2;

export async function finalizeCompanyRefreshStep(
  runId: string,
  result: Awaited<ReturnType<typeof refreshCompanyWebsiteStep>>,
) {
  "use step";
  await getDb()
    .update(researchRuns)
    .set({
      status: "completed",
      provider: "deterministic-web",
      model: "website-intelligence-v1",
      foundCount: 1,
      errors: result.errors,
      completedAt: new Date(),
      metadata: {
        stage: "completed",
        progress: 100,
        researchType: "company-refresh",
        result,
      },
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, runId));
  return result;
}
