import "server-only";

import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { getDb } from "@/db";
import { companies, researchRuns } from "@/db/schema";
import { dateInSaoPaulo } from "@/lib/domain";
import { companyRefreshWorkflow } from "@/workflows/company-refresh";

export async function enqueueCompanyRefresh(companyId: string) {
  const db = getDb();
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) throw new Error("Empresa não encontrada");
  if (!company.domain) throw new Error("Empresa sem domínio oficial");
  const [run] = await db
    .insert(researchRuns)
    .values({
      runDate: dateInSaoPaulo(),
      kind: `company-refresh-${companyId}-${crypto.randomUUID()}`,
      status: "queued",
      provider: "deterministic-web",
      metadata: {
        stage: "queued",
        progress: 5,
        researchType: "company-refresh",
        companyId,
        companyName: company.name,
      },
    })
    .returning({ id: researchRuns.id });
  const workflow = await start(companyRefreshWorkflow, [companyId, run.id]);
  await db
    .update(researchRuns)
    .set({
      metadata: {
        stage: "queued",
        progress: 5,
        researchType: "company-refresh",
        companyId,
        companyName: company.name,
        workflowRunId: workflow.runId,
      },
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, run.id));
  return { runId: run.id, workflowRunId: workflow.runId };
}
