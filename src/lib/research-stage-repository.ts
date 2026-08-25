import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { researchStageRuns } from "@/db/schema";

export function stableInputHash(input: unknown) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function startResearchStage(input: {
  researchRunId: string;
  companyId?: string;
  stage: string;
  provider?: string;
  payload?: unknown;
}) {
  const db = getDb();
  const filters = [
    eq(researchStageRuns.researchRunId, input.researchRunId),
    eq(researchStageRuns.stage, input.stage),
    input.companyId
      ? eq(researchStageRuns.companyId, input.companyId)
      : isNull(researchStageRuns.companyId),
  ];
  const [previous] = await db
    .select({ attempt: researchStageRuns.attempt })
    .from(researchStageRuns)
    .where(and(...filters))
    .orderBy(desc(researchStageRuns.attempt))
    .limit(1);
  const [row] = await db
    .insert(researchStageRuns)
    .values({
      researchRunId: input.researchRunId,
      companyId: input.companyId,
      stage: input.stage,
      status: "RUNNING",
      attempt: (previous?.attempt ?? 0) + 1,
      inputHash:
        input.payload === undefined
          ? undefined
          : stableInputHash(input.payload),
      provider: input.provider,
      startedAt: new Date(),
    })
    .returning({
      id: researchStageRuns.id,
      startedAt: researchStageRuns.startedAt,
    });
  return row;
}

export async function completeResearchStage(
  id: string,
  input: {
    outputReference?: string;
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const now = new Date();
  const [row] = await getDb()
    .select({ startedAt: researchStageRuns.startedAt })
    .from(researchStageRuns)
    .where(eq(researchStageRuns.id, id))
    .limit(1);
  await getDb()
    .update(researchStageRuns)
    .set({
      status: "COMPLETED",
      outputReference: input.outputReference,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      estimatedCost: String(input.estimatedCost ?? 0),
      durationMs: row ? now.getTime() - row.startedAt.getTime() : undefined,
      metadata: input.metadata,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(researchStageRuns.id, id));
}

export async function failResearchStage(id: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "STAGE_ERROR")
      : "STAGE_ERROR";
  await getDb()
    .update(researchStageRuns)
    .set({
      status: "FAILED",
      errorCode: code,
      errorMessage: message.slice(0, 2_000),
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(researchStageRuns.id, id));
}

export async function withResearchStage<T>(
  input: Parameters<typeof startResearchStage>[0],
  operation: () => Promise<T>,
  summarize?: (result: T) => Parameters<typeof completeResearchStage>[1],
) {
  const stage = await startResearchStage(input);
  try {
    const result = await operation();
    await completeResearchStage(stage.id, summarize?.(result));
    return result;
  } catch (error) {
    await failResearchStage(stage.id, error);
    throw error;
  }
}
