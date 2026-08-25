import "server-only";

import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  dailyLeadQueue,
  opportunityScores,
  sdrIntelligence,
  verticals,
} from "@/db/schema";
import {
  dateInSaoPaulo,
  isForbiddenSectorCompany,
  isValidVerticalClassification,
} from "@/lib/domain";

export type DailyQueueItem = {
  id: string;
  companyId: string;
  companyName: string;
  verticalId?: string;
  rank: number;
  status: string;
  opportunityScore: number;
  confidenceScore: number;
  recommendedSolution: string;
  whyNow?: string;
};

function isEligibleQueueCompany(company: {
  name?: string;
  companyName?: string;
  tradeName: string | null;
  domain: string | null;
  vertical: string;
  subsegment: string | null;
  description: string | null;
  analysisMetadata: unknown;
}) {
  const name = company.name ?? company.companyName;
  if (!name) return false;
  if (
    !company.subsegment ||
    !isValidVerticalClassification(company.vertical, company.subsegment)
  )
    return false;

  const metadata =
    company.analysisMetadata && typeof company.analysisMetadata === "object"
      ? (company.analysisMetadata as Record<string, unknown>)
      : {};
  const text = (key: string) =>
    typeof metadata[key] === "string" ? metadata[key] : undefined;

  return !isForbiddenSectorCompany({
    name,
    tradeName: company.tradeName ?? undefined,
    domain: company.domain ?? undefined,
    coreBusiness: text("coreBusiness"),
    description: company.description ?? undefined,
    classificationReason: text("classificationReason"),
  }).forbidden;
}

export async function buildDailyLeadQueue(
  date = dateInSaoPaulo(),
  limit = 30,
  cooldownDays = 90,
) {
  const db = getDb();
  const now = new Date();
  const candidates = await db
    .select({
      companyId: companies.id,
      name: companies.name,
      tradeName: companies.tradeName,
      domain: companies.domain,
      verticalId: companies.verticalId,
      vertical: verticals.name,
      subsegment: companies.subsegment,
      description: companies.description,
      analysisMetadata: companies.analysisMetadata,
      opportunityScore: opportunityScores.opportunityScore,
      confidenceScore: opportunityScores.confidenceScore,
      recommendedSolution: companies.suggestedSolution,
      whyNow: sdrIntelligence.whyNow,
    })
    .from(companies)
    .innerJoin(verticals, eq(verticals.id, companies.verticalId))
    .innerJoin(opportunityScores, eq(opportunityScores.companyId, companies.id))
    .leftJoin(sdrIntelligence, eq(sdrIntelligence.companyId, companies.id))
    .where(
      and(
        isNull(companies.deletedAt),
        eq(verticals.active, true),
        eq(companies.qualificationStatus, "READY"),
        or(isNull(companies.cooldownUntil), lte(companies.cooldownUntil, now)),
      ),
    )
    .orderBy(
      desc(opportunityScores.opportunityScore),
      desc(opportunityScores.confidenceScore),
    )
    .limit(limit * 8);

  const perVerticalLimit = Math.max(2, Math.ceil(limit / 5));
  const verticalCounts = new Map<string, number>();
  const selected = candidates
    .filter(isEligibleQueueCompany)
    .filter((candidate) => {
      const key = candidate.verticalId ?? "unclassified";
      const count = verticalCounts.get(key) ?? 0;
      if (count >= perVerticalLimit) return false;
      verticalCounts.set(key, count + 1);
      return true;
    })
    .slice(0, limit);

  let rank = 1;
  for (const candidate of selected) {
    if (!candidate.recommendedSolution) continue;
    const [inserted] = await db
      .insert(dailyLeadQueue)
      .values({
        queueDate: date,
        companyId: candidate.companyId,
        rank,
        status: "READY",
        opportunityScore: candidate.opportunityScore,
        confidenceScore: candidate.confidenceScore,
        recommendedSolution: candidate.recommendedSolution,
        whyNow: candidate.whyNow,
      })
      .onConflictDoNothing({
        target: [dailyLeadQueue.queueDate, dailyLeadQueue.companyId],
      })
      .returning({ id: dailyLeadQueue.id });
    if (!inserted) continue;
    const cooldownUntil = new Date(now.getTime() + cooldownDays * 86_400_000);
    await db
      .update(companies)
      .set({
        lastSuggestedAt: now,
        cooldownUntil,
        timesSuggested: sql`${companies.timesSuggested} + 1`,
        updatedAt: now,
      })
      .where(eq(companies.id, candidate.companyId));
    rank += 1;
  }
  return rank - 1;
}

export async function updateDailyQueueItem(
  id: string,
  input: {
    status: "READY" | "CLAIMED" | "CONTACTED" | "SNOOZED" | "DISMISSED";
    actor?: string;
    outcome?: string;
    note?: string;
  },
) {
  const now = new Date();
  const [updated] = await getDb()
    .update(dailyLeadQueue)
    .set({
      status: input.status,
      claimedBy: input.status === "CLAIMED" ? input.actor : undefined,
      claimedAt: input.status === "CLAIMED" ? now : undefined,
      completedAt: ["CONTACTED", "DISMISSED"].includes(input.status)
        ? now
        : undefined,
      outcome: input.outcome,
      outcomeNote: input.note,
      updatedAt: now,
    })
    .where(eq(dailyLeadQueue.id, id))
    .returning({ companyId: dailyLeadQueue.companyId });
  if (!updated) return false;
  if (input.status === "CONTACTED")
    await getDb()
      .update(companies)
      .set({ lastContactedAt: now, updatedAt: now })
      .where(eq(companies.id, updated.companyId));
  return true;
}

export async function listDailyLeadQueue(
  date = dateInSaoPaulo(),
): Promise<DailyQueueItem[]> {
  const rows = await getDb()
    .select({
      id: dailyLeadQueue.id,
      companyId: dailyLeadQueue.companyId,
      companyName: companies.name,
      tradeName: companies.tradeName,
      domain: companies.domain,
      verticalId: companies.verticalId,
      vertical: verticals.name,
      subsegment: companies.subsegment,
      description: companies.description,
      analysisMetadata: companies.analysisMetadata,
      rank: dailyLeadQueue.rank,
      status: dailyLeadQueue.status,
      opportunityScore: dailyLeadQueue.opportunityScore,
      confidenceScore: dailyLeadQueue.confidenceScore,
      recommendedSolution: dailyLeadQueue.recommendedSolution,
      whyNow: dailyLeadQueue.whyNow,
    })
    .from(dailyLeadQueue)
    .innerJoin(companies, eq(companies.id, dailyLeadQueue.companyId))
    .innerJoin(verticals, eq(verticals.id, companies.verticalId))
    .where(and(eq(dailyLeadQueue.queueDate, date), eq(verticals.active, true)))
    .orderBy(dailyLeadQueue.rank);
  return rows.filter(isEligibleQueueCompany).map((row) => ({
    id: row.id,
    companyId: row.companyId,
    companyName: row.companyName,
    verticalId: row.verticalId ?? undefined,
    rank: row.rank,
    status: row.status,
    opportunityScore: row.opportunityScore,
    confidenceScore: row.confidenceScore,
    recommendedSolution: row.recommendedSolution,
    whyNow: row.whyNow ?? undefined,
  }));
}
