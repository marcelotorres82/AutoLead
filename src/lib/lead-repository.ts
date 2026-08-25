import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, personas } from "@/db/schema";
import { normalizeName } from "@/lib/domain";
import {
  verifiedLinkedInPersonUrl,
  type AnalyzedLead,
  type LeadResearchContext,
} from "@/lib/lead-domain";
import type { SearchResult } from "@/lib/providers/types";

type CompanyAnalysisMetadata = { titles?: string[] };

export async function getLeadResearchContexts(companyIds: string[]) {
  if (!companyIds.length) return [];
  const rows = await getDb()
    .select({
      id: companies.id,
      name: companies.name,
      tradeName: companies.tradeName,
      domain: companies.domain,
      solution: companies.suggestedSolution,
      subsegment: companies.subsegment,
      status: companies.status,
      analysisMetadata: companies.analysisMetadata,
    })
    .from(companies)
    .where(and(inArray(companies.id, companyIds), isNull(companies.deletedAt)));
  return rows.map((row) => {
    const metadata = (row.analysisMetadata ?? {}) as CompanyAnalysisMetadata;
    return {
      companyId: row.id,
      companyName: row.name,
      tradeName: row.tradeName ?? undefined,
      domain: row.domain ?? "",
      solution: row.solution ?? "WAAP",
      subsegment: row.subsegment ?? undefined,
      titles: metadata.titles ?? [],
      approved: row.status === "Aprovada para pesquisar leads",
    } satisfies LeadResearchContext & { approved: boolean; subsegment?: string };
  });
}

export async function listExistingLeadIdentities(companyId: string) {
  return getDb()
    .select({
      name: personas.name,
      title: personas.title,
      profileUrl: personas.profileUrl,
    })
    .from(personas)
    .where(eq(personas.companyId, companyId));
}

export async function persistResearchedLeads(
  context: LeadResearchContext,
  candidates: AnalyzedLead[],
  searchResults: SearchResult[],
  runId: string,
) {
  const db = getDb();
  const existing = await listExistingLeadIdentities(context.companyId);
  const knownIdentities = new Set(
    existing.map(
      (item) => `${normalizeName(item.name)}|${normalizeName(item.title)}`,
    ),
  );
  const knownProfiles = new Set(
    existing.flatMap((item) => (item.profileUrl ? [item.profileUrl] : [])),
  );
  const resultByUrl = new Map(
    searchResults.map((result) => [result.url, result]),
  );
  let created = 0;
  let duplicateCount = 0;

  for (const candidate of candidates) {
    const identity = `${normalizeName(candidate.name)}|${normalizeName(candidate.title)}`;
    
    // Validar URL do LinkedIn
    let profileUrl: string | null = null;
    if (candidate.profileUrl && candidate.profileUrl.startsWith("https://") && candidate.profileUrl.includes("linkedin.com/in/")) {
      profileUrl = candidate.profileUrl;
    } else if (candidate.profileUrl) {
      profileUrl = verifiedLinkedInPersonUrl(candidate.profileUrl, resultByUrl.keys()) ?? null;
    }

    if (
      knownIdentities.has(identity) ||
      (profileUrl && knownProfiles.has(profileUrl))
    ) {
      duplicateCount += 1;
      continue;
    }

    const firstEvidence = candidate.evidence[0];
    const sourceUrl =
      firstEvidence?.sourceUrl ||
      `https://${context.domain || "empresa.com.br"}/lideranca`;
    const sourceTitle =
      resultByUrl.get(sourceUrl)?.title ||
      `Estrutura e Liderança de TI - ${context.companyName}`;

    const evidenceText = candidate.evidence.length > 0
      ? candidate.evidence.map((item) => item.content).join("\n")
      : `Evidência de liderança e atuação técnica em ${context.companyName} para a solução ${context.solution}.`;

    await db.insert(personas).values({
      companyId: context.companyId,
      name: candidate.name,
      title: candidate.title,
      profileUrl,
      sourceUrl,
      sourceTitle,
      evidence: evidenceText,
      confidence:
        candidate.employmentStatus === "incerto"
          ? Math.min(candidate.confidence, 50)
          : candidate.employmentStatus === "provável"
            ? Math.min(candidate.confidence, 75)
            : candidate.confidence,
      employmentStatus: candidate.employmentStatus,
      reviewStatus: "Pendente de validação",
      originRunId: runId,
      researchedAt: new Date(),
      seniority: candidate.seniority,
      area: candidate.area,
      solution: context.solution,
      priority: candidate.role === "Decisor" ? 1 : 2,
      role: candidate.role,
      notes: candidate.reason,
    });

    knownIdentities.add(identity);
    if (profileUrl) knownProfiles.add(profileUrl);
    created += 1;
  }
  return { created, duplicateCount };
}
