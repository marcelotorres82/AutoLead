import { executeResearchStep } from "@/workflows/research/steps";

export async function researchWorkflow(
  runId: string,
  date: string,
  kind: string,
  criteria?: string,
) {
  "use workflow";
  return executeResearchStep(runId, date, kind, criteria);
}
