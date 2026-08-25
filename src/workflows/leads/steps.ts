import { FatalError, RetryableError } from "workflow";
import { runLeadResearch } from "@/lib/lead-research";

export async function executeLeadResearchStep(
  runId: string,
  companyId: string,
) {
  "use step";
  try {
    return await runLeadResearch(runId, companyId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("incompletas") ||
      message.includes("Nenhum provedor") ||
      message.includes("precisa estar aprovada") ||
      message.includes("não encontrada")
    )
      throw new FatalError(message);
    throw new RetryableError(message, { retryAfter: "10s" });
  }
}

executeLeadResearchStep.maxRetries = 2;
