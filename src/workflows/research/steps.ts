import { FatalError, RetryableError } from "workflow";
import { runDailyResearch } from "@/lib/research";
import { notifyTelegramResearchResult } from "@/lib/telegram";

export async function executeResearchStep(
  runId: string,
  date: string,
  kind: string,
  criteria?: string,
  forceRefresh = false,
) {
  "use step";
  try {
    const result = await runDailyResearch(
      date,
      false,
      kind,
      criteria,
      runId,
      forceRefresh,
    );
    if (result.status === "completed")
      await notifyTelegramResearchResult(runId, result.created);
    return {
      status: result.status,
      created: result.created,
      durationMs: "durationMs" in result ? result.durationMs : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("incompletas") || message.includes("Nenhum provedor"))
      throw new FatalError(message);
    throw new RetryableError(message, { retryAfter: "10s" });
  }
}

executeResearchStep.maxRetries = 2;
