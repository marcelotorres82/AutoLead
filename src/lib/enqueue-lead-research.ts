import "server-only";

import { start } from "workflow/api";
import { getLeadResearchContexts } from "@/lib/lead-repository";
import {
  createResearchRun,
  findActiveLeadResearchRun,
  getResearchRun,
  markResearchRunFailed,
  updateResearchRunMetadata,
} from "@/lib/research-run-repository";
import { leadResearchWorkflow } from "@/workflows/leads";

export async function enqueueLeadResearch(companyId: string, date: string) {
  const active = await findActiveLeadResearchRun(companyId);
  if (active) return active;
  const [context] = await getLeadResearchContexts([companyId]);
  if (!context) throw new Error("Empresa não encontrada");
  if (!context.approved)
    throw new Error("A empresa precisa estar aprovada para pesquisar leads");
  const created = await createResearchRun(
    date,
    `leads-${companyId}-${crypto.randomUUID()}`,
    `Decisores em ${context.companyName}`,
  );
  try {
    await updateResearchRunMetadata(created.run.id, {
      researchType: "leads",
      companyId,
      companyName: context.companyName,
      stage: "queued",
      progress: 5,
    });
    const workflow = await start(leadResearchWorkflow, [
      created.run.id,
      companyId,
    ]);
    await updateResearchRunMetadata(created.run.id, {
      workflowRunId: workflow.runId,
    });
    return (await getResearchRun(created.run.id)) ?? created.run;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markResearchRunFailed(created.run.id, message);
    throw error;
  }
}
