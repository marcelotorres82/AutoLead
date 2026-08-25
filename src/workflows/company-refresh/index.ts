import {
  finalizeCompanyRefreshStep,
  refreshCompanyWebsiteStep,
} from "@/workflows/company-refresh/steps";

export async function companyRefreshWorkflow(companyId: string, runId: string) {
  "use workflow";
  const result = await refreshCompanyWebsiteStep(companyId, runId);
  return finalizeCompanyRefreshStep(runId, result);
}
