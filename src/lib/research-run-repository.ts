import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchRuns } from "@/db/schema";

export type ResearchRunMetadata = {
  criteria?: string;
  stage?: string;
  progress?: number;
  workflowRunId?: string;
};

export type ResearchRunView = {
  id: string;
  date: string;
  kind: string;
  status: string;
  provider?: string;
  model?: string;
  searchCount: number;
  foundCount: number;
  duplicateCount: number;
  durationMs?: number;
  estimatedCost: number;
  errors: string[];
  criteria?: string;
  stage: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
};

function toView(row: typeof researchRuns.$inferSelect): ResearchRunView {
  const metadata = (row.metadata ?? {}) as ResearchRunMetadata;
  return {
    id: row.id,
    date: row.runDate,
    kind: row.kind,
    status: row.status,
    provider: row.provider ?? undefined,
    model: row.model ?? undefined,
    searchCount: row.searchCount ?? 0,
    foundCount: row.foundCount ?? 0,
    duplicateCount: row.duplicateCount ?? 0,
    durationMs: row.durationMs ?? undefined,
    estimatedCost: Number(row.estimatedCost ?? 0),
    errors: (row.errors ?? []) as string[],
    criteria: metadata.criteria,
    stage: metadata.stage ?? row.status,
    progress: metadata.progress ?? (row.status === "completed" ? 100 : 0),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

export async function createResearchRun(
  date: string,
  kind: string,
  criteria?: string,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(researchRuns)
    .where(and(eq(researchRuns.runDate, date), eq(researchRuns.kind, kind)))
    .limit(1);
  if (existing) return { run: toView(existing), created: false };
  const [row] = await db
    .insert(researchRuns)
    .values({
      runDate: date,
      kind,
      status: "queued",
      metadata: { criteria, stage: "queued", progress: 5 },
    })
    .onConflictDoNothing({
      target: [researchRuns.runDate, researchRuns.kind],
    })
    .returning();
  if (row) return { run: toView(row), created: true };
  const [concurrent] = await db
    .select()
    .from(researchRuns)
    .where(and(eq(researchRuns.runDate, date), eq(researchRuns.kind, kind)))
    .limit(1);
  if (!concurrent) throw new Error("Falha ao registrar a pesquisa");
  return { run: toView(concurrent), created: false };
}

export async function getResearchRun(id: string) {
  const [row] = await getDb()
    .select()
    .from(researchRuns)
    .where(eq(researchRuns.id, id))
    .limit(1);
  return row ? toView(row) : null;
}

export async function listResearchRuns(limit = 20) {
  const rows = await getDb()
    .select()
    .from(researchRuns)
    .orderBy(desc(researchRuns.createdAt))
    .limit(limit);
  return rows.map(toView);
}

export async function updateResearchRunMetadata(
  id: string,
  patch: ResearchRunMetadata,
) {
  const db = getDb();
  const [row] = await db
    .select({ metadata: researchRuns.metadata })
    .from(researchRuns)
    .where(eq(researchRuns.id, id))
    .limit(1);
  await db
    .update(researchRuns)
    .set({
      metadata: {
        ...((row?.metadata ?? {}) as ResearchRunMetadata),
        ...patch,
      },
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, id));
}

export async function markResearchRunFailed(id: string, message: string) {
  const db = getDb();
  const [row] = await db
    .select({ metadata: researchRuns.metadata })
    .from(researchRuns)
    .where(eq(researchRuns.id, id))
    .limit(1);
  await db
    .update(researchRuns)
    .set({
      status: "failed",
      errors: [message],
      metadata: {
        ...((row?.metadata ?? {}) as ResearchRunMetadata),
        stage: "failed",
        progress: 100,
      },
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(researchRuns.id, id));
}
