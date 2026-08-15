import "server-only";

import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { backups } from "@/db/schema";
import { createBackup } from "@/lib/backup";
import { listCompanies } from "@/lib/company-repository";
import { listPersonas } from "@/lib/operations-repository";
import { VercelBlobStorage } from "@/lib/providers/blob";
import { listResearchRuns } from "@/lib/research-run-repository";

export async function createPrivateBackup() {
  const [companies, personas, history] = await Promise.all([
    listCompanies(),
    listPersonas(),
    listResearchRuns(500),
  ]);
  const backup = createBackup({
    filters: { mode: "real" },
    companies,
    evidence: companies.flatMap((company) => company.sources),
    personas,
    history,
  });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const path = `backups/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/prospect-radar-${stamp}.json`;
  const stored = await new VercelBlobStorage().put(path, backup.json);
  const [row] = await getDb()
    .insert(backups)
    .values({
      blobPath: stored.pathname,
      sha256: backup.sha256,
      size: stored.size,
      recordCount: backup.records,
      status: "completed",
      metadata: { schemaVersion: "1.0" },
    })
    .returning();
  return row;
}

export async function listBackups(limit = 30) {
  return getDb()
    .select()
    .from(backups)
    .orderBy(desc(backups.createdAt))
    .limit(limit);
}
