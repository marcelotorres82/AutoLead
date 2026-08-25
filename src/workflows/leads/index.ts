import { executeLeadResearchStep } from "@/workflows/leads/steps";

export async function leadResearchWorkflow(runId: string, companyId: string) {
  "use workflow";
  return executeLeadResearchStep(runId, companyId);
}
