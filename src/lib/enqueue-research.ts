import "server-only";

import { start } from "workflow/api";
import {
  createResearchRun,
  getResearchRun,
  markResearchRunFailed,
  updateResearchRunMetadata,
} from "@/lib/research-run-repository";
import { researchWorkflow } from "@/workflows/research";

export async function enqueueResearch(
  date: string,
  kind: string,
  criteria?: string,
  forceRefresh = false,
) {
  const created = await createResearchRun(date, kind, criteria);
  if (!created.created) return created.run;
  try {
    const workflow = await start(researchWorkflow, [
      created.run.id,
      date,
      kind,
      criteria,
      forceRefresh,
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
