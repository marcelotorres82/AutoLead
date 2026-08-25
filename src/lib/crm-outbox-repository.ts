import "server-only";

import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, crmOutbox, opportunityScores } from "@/db/schema";

export async function queueCompanyForCrm(
  companyId: string,
  destination = "Salesloft",
) {
  const db = getDb();
  const [row] = await db
    .select({ company: companies, score: opportunityScores })
    .from(companies)
    .leftJoin(opportunityScores, eq(opportunityScores.companyId, companies.id))
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!row) throw new Error("Empresa não encontrada");
  const payload = {
    companyId,
    name: row.company.name,
    domain: row.company.domain,
    city: row.company.city,
    state: row.company.state,
    solution: row.company.suggestedSolution,
    opportunityScore: row.score?.opportunityScore ?? row.company.score,
    confidenceScore: row.score?.confidenceScore ?? 0,
    qualificationStatus: row.company.qualificationStatus,
  };
  const idempotencyKey = createHash("sha256")
    .update(`${destination}:${companyId}:${JSON.stringify(payload)}`)
    .digest("hex");
  let [item] = await db
    .insert(crmOutbox)
    .values({ companyId, destination, idempotencyKey, payload })
    .onConflictDoNothing({ target: crmOutbox.idempotencyKey })
    .returning();
  if (!item) {
    [item] = await db
      .select()
      .from(crmOutbox)
      .where(eq(crmOutbox.idempotencyKey, idempotencyKey))
      .limit(1);
  }
  return item;
}

export async function listCrmOutbox(limit = 100) {
  return getDb()
    .select()
    .from(crmOutbox)
    .orderBy(desc(crmOutbox.createdAt))
    .limit(limit);
}

export async function approveCrmOutboxItem(id: string, actor: string) {
  const [item] = await getDb()
    .update(crmOutbox)
    .set({
      status: "APPROVED",
      approvedBy: actor,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(crmOutbox.id, id))
    .returning();
  return item;
}
