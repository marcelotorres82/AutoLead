import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  companyEvidence,
  evidenceAudits,
  evidenceVersions,
  opportunityScores,
  scoringProfiles,
  sourceFetches,
  sources,
  technicalSignals,
  verticals,
} from "@/db/schema";
import {
  calculateEvidenceFirstScores,
  passesEvidenceGate,
  recommendedSolutionFromScores,
  type EvidenceRecord,
} from "@/lib/evidence-intelligence";
import { applyScoringProfile } from "@/lib/scoring-profiles";
import { inspectCompanyWebsite } from "@/lib/website-intelligence";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function evidenceType(type: string) {
  if (type === "api") return "api";
  if (type === "application") return "application";
  if (type === "technology" || type === "edge" || type === "analytics")
    return "technology";
  return "other";
}

export async function refreshCompanyWebsiteIntelligence(
  companyId: string,
  researchRunId?: string,
) {
  const db = getDb();
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      vertical: verticals.name,
    })
    .from(companies)
    .leftJoin(verticals, eq(companies.verticalId, verticals.id))
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company?.domain)
    throw new Error("Empresa sem domínio oficial para inspeção");

  const inspection = await inspectCompanyWebsite(company.domain);
  const changes: Array<{ url: string; type: "NEW" | "CHANGED" | "UNCHANGED" }> =
    [];
  const fetchIds = new Map<string, string>();

  for (const page of inspection.pages) {
    const [previous] = await db
      .select({ contentHash: sourceFetches.contentHash })
      .from(sourceFetches)
      .where(
        and(
          eq(sourceFetches.companyId, companyId),
          eq(sourceFetches.finalUrl, page.finalUrl),
        ),
      )
      .orderBy(desc(sourceFetches.fetchedAt))
      .limit(1);
    changes.push({
      url: page.finalUrl,
      type: !previous
        ? "NEW"
        : previous.contentHash === page.contentHash
          ? "UNCHANGED"
          : "CHANGED",
    });
    let [saved] = await db
      .insert(sourceFetches)
      .values({
        companyId,
        researchRunId,
        requestedUrl: page.requestedUrl,
        finalUrl: page.finalUrl,
        category: page.category,
        statusCode: page.statusCode,
        mimeType: page.mimeType,
        contentHash: page.contentHash,
        contentLength: page.contentLength,
        title: page.title,
        excerpt: page.excerpt,
        fetchDurationMs: page.durationMs,
        fetchedAt: new Date(),
        metadata: { headers: page.headers },
      })
      .onConflictDoNothing()
      .returning({ id: sourceFetches.id });
    if (!saved) {
      [saved] = await db
        .select({ id: sourceFetches.id })
        .from(sourceFetches)
        .where(
          and(
            eq(sourceFetches.companyId, companyId),
            eq(sourceFetches.finalUrl, page.finalUrl),
            eq(sourceFetches.contentHash, page.contentHash),
          ),
        )
        .limit(1);
    }
    if (saved) fetchIds.set(page.finalUrl, saved.id);
  }

  for (const signal of inspection.signals) {
    await db
      .insert(technicalSignals)
      .values({
        companyId,
        type: signal.type,
        value: signal.value,
        sourceUrl: signal.sourceUrl,
        detectionMethod: signal.detectionMethod,
        confidence: signal.confidence,
        detectedAt: new Date(signal.detectedAt),
      })
      .onConflictDoUpdate({
        target: [
          technicalSignals.companyId,
          technicalSignals.value,
          technicalSignals.sourceUrl,
        ],
        set: {
          type: signal.type,
          detectionMethod: signal.detectionMethod,
          confidence: signal.confidence,
          detectedAt: new Date(signal.detectedAt),
          updatedAt: new Date(),
        },
      });

    const page = inspection.pages.find(
      (item) => item.finalUrl === signal.sourceUrl,
    );
    if (!page) continue;
    let [source] = await db
      .insert(sources)
      .values({
        title: page.title ?? `${company.name} — site oficial`,
        domain: inspection.domain,
        url: page.finalUrl,
        accessedAt: new Date(),
        summary: page.excerpt,
        rawMetadata: {
          provider: "website-intelligence",
          contentHash: page.contentHash,
        },
      })
      .onConflictDoNothing({ target: sources.url })
      .returning({ id: sources.id });
    if (!source) {
      [source] = await db
        .select({ id: sources.id })
        .from(sources)
        .where(eq(sources.url, page.finalUrl))
        .limit(1);
    }
    if (!source) continue;
    const claim = `O site oficial apresenta sinal técnico de ${signal.value}.`;
    const [existingEvidence] = await db
      .select({ id: companyEvidence.id })
      .from(companyEvidence)
      .where(
        and(
          eq(companyEvidence.companyId, companyId),
          eq(companyEvidence.sourceId, source.id),
          eq(companyEvidence.content, claim),
        ),
      )
      .limit(1);
    let evidenceId = existingEvidence?.id;
    if (!evidenceId) {
      const [inserted] = await db
        .insert(companyEvidence)
        .values({
          companyId,
          sourceId: source.id,
          kind: "fact",
          content: claim,
          evidenceType: evidenceType(signal.type),
          statementKind: "FACT",
          excerpt: page.excerpt.slice(0, 600),
          confidence: signal.confidence,
          sourceQuality: 100,
          freshnessScore: 100,
          verified: true,
          relevantSolutions:
            signal.type === "api"
              ? ["API Security"]
              : signal.type === "application"
                ? ["WAAP"]
                : ["API Security", "WAAP", "Guardicore"],
        })
        .returning({ id: companyEvidence.id });
      evidenceId = inserted?.id;
    }
    if (!evidenceId) continue;
    const versions = await db
      .select({ version: evidenceVersions.version })
      .from(evidenceVersions)
      .where(eq(evidenceVersions.evidenceId, evidenceId))
      .orderBy(desc(evidenceVersions.version))
      .limit(1);
    const contentHash = hash(`${claim}\n${page.excerpt}`);
    const [sameVersion] = await db
      .select({ id: evidenceVersions.id })
      .from(evidenceVersions)
      .where(
        and(
          eq(evidenceVersions.evidenceId, evidenceId),
          eq(evidenceVersions.contentHash, contentHash),
        ),
      )
      .limit(1);
    if (!sameVersion)
      await db.insert(evidenceVersions).values({
        evidenceId,
        sourceFetchId: fetchIds.get(page.finalUrl),
        version: (versions[0]?.version ?? 0) + 1,
        status: "ACTIVE",
        contentHash,
        claim,
        excerpt: page.excerpt.slice(0, 600),
      });
  }

  const [evidenceRows, signalRows] = await Promise.all([
    db
      .select({ evidence: companyEvidence, source: sources })
      .from(companyEvidence)
      .innerJoin(sources, eq(companyEvidence.sourceId, sources.id))
      .where(eq(companyEvidence.companyId, companyId)),
    db
      .select()
      .from(technicalSignals)
      .where(eq(technicalSignals.companyId, companyId)),
  ]);
  const evidence: EvidenceRecord[] = evidenceRows.map(
    ({ evidence, source }) => ({
      type: evidence.evidenceType as EvidenceRecord["type"],
      statementKind: evidence.statementKind as EvidenceRecord["statementKind"],
      claim: evidence.content,
      sourceUrl: source.url,
      sourceTitle: source.title,
      publisher: source.domain,
      publishedAt: source.publishedAt?.toISOString(),
      collectedAt: evidence.collectedAt.toISOString(),
      excerpt: evidence.excerpt ?? undefined,
      confidence: evidence.confidence,
      sourceQuality: evidence.sourceQuality,
      freshnessScore: evidence.freshnessScore,
      verified: evidence.verified,
      relevantSolutions: (evidence.relevantSolutions ??
        []) as EvidenceRecord["relevantSolutions"],
    }),
  );
  const baseScores = calculateEvidenceFirstScores(
    evidence,
    signalRows.map((signal) => ({
      type: signal.type,
      value: signal.value,
      sourceUrl: signal.sourceUrl,
      detectionMethod: signal.detectionMethod as "website",
      confidence: signal.confidence,
      detectedAt: signal.detectedAt.toISOString(),
    })),
  );
  const scores = applyScoringProfile(baseScores, company.vertical ?? "");
  const solution = recommendedSolutionFromScores(scores);
  const gate = passesEvidenceGate(scores, evidence, solution);
  const [profile] = await db
    .select({ id: scoringProfiles.id })
    .from(scoringProfiles)
    .where(
      and(
        eq(scoringProfiles.version, scores.profileVersion),
        eq(scoringProfiles.active, true),
      ),
    )
    .limit(1);
  await db
    .insert(opportunityScores)
    .values({
      companyId,
      digitalExposureScore: scores.digitalExposureScore,
      waapScore: scores.waapScore,
      apiSecurityScore: scores.apiSecurityScore,
      guardicoreScore: scores.guardicoreScore,
      confidenceScore: scores.confidenceScore,
      opportunityScore: scores.opportunityScore,
      evidenceCount: scores.evidenceCount,
      independentSourceCount: scores.independentSourceCount,
      algorithmVersion: scores.algorithmVersion,
      scoringProfileId: profile?.id,
      scoringProfileVersion: scores.profileVersion,
      breakdown: { gate: gate.reasons, profile: scores.profileName },
    })
    .onConflictDoUpdate({
      target: opportunityScores.companyId,
      set: {
        digitalExposureScore: scores.digitalExposureScore,
        waapScore: scores.waapScore,
        apiSecurityScore: scores.apiSecurityScore,
        guardicoreScore: scores.guardicoreScore,
        confidenceScore: scores.confidenceScore,
        opportunityScore: scores.opportunityScore,
        evidenceCount: scores.evidenceCount,
        independentSourceCount: scores.independentSourceCount,
        algorithmVersion: scores.algorithmVersion,
        scoringProfileId: profile?.id,
        scoringProfileVersion: scores.profileVersion,
        breakdown: { gate: gate.reasons, profile: scores.profileName },
        updatedAt: new Date(),
      },
    });
  await db
    .update(companies)
    .set({
      suggestedSolution: solution,
      score: scores.opportunityScore,
      qualificationStatus: gate.status,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  const issues = [
    inspection.pages.length === 0
      ? "Nenhuma página oficial pôde ser coletada"
      : null,
    inspection.signals.length === 0
      ? "Nenhum sinal técnico determinístico encontrado"
      : null,
    inspection.errors.length > inspection.pages.length
      ? "Taxa elevada de falhas na coleta"
      : null,
    scores.confidenceScore < 70 ? "Confiança abaixo do Evidence Gate" : null,
  ].filter((item): item is string => Boolean(item));
  await db.insert(evidenceAudits).values({
    companyId,
    researchRunId,
    auditType: "DETERMINISTIC",
    status: issues.length ? "REVIEW" : "PASSED",
    score: Math.max(0, 100 - issues.length * 20),
    issues,
    sampled: true,
    metadata: {
      pages: inspection.pages.length,
      signals: inspection.signals.length,
    },
  });

  return {
    pages: inspection.pages.length,
    signals: inspection.signals.length,
    discoveredUrls: inspection.discoveredUrls,
    errors: inspection.errors,
    changes,
    score: scores.opportunityScore,
    confidence: scores.confidenceScore,
    qualificationStatus: gate.status,
    profileVersion: scores.profileVersion,
  };
}
