import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  companies,
  companyAliases,
  companyEvidence,
  companyStatusHistory,
  researchRunCompanies,
  solutionScores,
  sources,
  users,
  verticals,
} from "@/db/schema";
import {
  calculateScore,
  dateInSaoPaulo,
  extractEmployeeLimit,
  extractEmployeeUpperBound,
  findDuplicate,
  isValidVerticalClassification,
  normalizeDomain,
  normalizeName,
  scoreBreakdownSchema,
  verifiedLinkedInCompanyUrl,
  type AnalyzedCompany,
  type Company,
  type CompanyStatus,
  type ScoreBreakdown,
} from "@/lib/domain";
import { env } from "@/lib/env";
import type { SearchResult } from "@/lib/providers/types";
import type { CompanyInventoryItem } from "@/lib/providers/types";

type AnalysisMetadata = {
  apiScore: number;
  waapScore: number;
  guardicoreScore: number;
  breakdown: ScoreBreakdown;
  titles: string[];
  navigatorQuery: string;
  tags: string[];
  criteriaMatch?: "compatible" | "uncertain" | "incompatible";
  criteriaReason?: string;
  criteriaConfidence?: number;
  coreBusiness?: string;
  classificationReason?: string;
  classificationSourceUrl?: string;
};

const emptyBreakdown: ScoreBreakdown = {
  verticalFit: 0,
  sizeComplexity: 0,
  digitalPresence: 0,
  transactionalChannels: 0,
  recentSignals: 0,
  solutionFit: 0,
  evidenceQuality: 0,
};

export async function listCompanyInventory(): Promise<CompanyInventoryItem[]> {
  const db = getDb();
  const [companyRows, aliasRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        tradeName: companies.tradeName,
        domain: companies.domain,
      })
      .from(companies)
      .where(isNull(companies.deletedAt)),
    db
      .select({
        companyId: companyAliases.companyId,
        alias: companyAliases.alias,
      })
      .from(companyAliases),
  ]);
  const aliasesByCompany = new Map<string, string[]>();
  for (const row of aliasRows) {
    const items = aliasesByCompany.get(row.companyId) ?? [];
    items.push(row.alias);
    aliasesByCompany.set(row.companyId, items);
  }
  return companyRows.map((row) => ({
    name: row.name,
    tradeName: row.tradeName ?? undefined,
    domain: row.domain ?? "",
    aliases: aliasesByCompany.get(row.id) ?? [],
  }));
}

export async function listCompanies(): Promise<Company[]> {
  const db = getDb();
  const rows = await db
    .select({ company: companies, vertical: verticals.name })
    .from(companies)
    .leftJoin(verticals, eq(companies.verticalId, verticals.id))
    .where(isNull(companies.deletedAt))
    .orderBy(desc(companies.discoveredAt), desc(companies.score))
    .limit(500);
  if (!rows.length) return [];
  const ids = rows.map(({ company }) => company.id);
  const [evidenceRows, scoreRows] = await Promise.all([
    db
      .select({ evidence: companyEvidence, source: sources })
      .from(companyEvidence)
      .innerJoin(sources, eq(companyEvidence.sourceId, sources.id))
      .where(inArray(companyEvidence.companyId, ids)),
    db
      .select()
      .from(solutionScores)
      .where(inArray(solutionScores.companyId, ids)),
  ]);
  const evidenceByCompany = new Map<string, typeof evidenceRows>();
  for (const row of evidenceRows) {
    const items = evidenceByCompany.get(row.evidence.companyId) ?? [];
    items.push(row);
    evidenceByCompany.set(row.evidence.companyId, items);
  }
  const scoresByCompany = new Map<string, Map<string, number>>();
  for (const score of scoreRows) {
    const values = scoresByCompany.get(score.companyId) ?? new Map();
    values.set(score.solution, score.score);
    scoresByCompany.set(score.companyId, values);
  }

  return rows.map(({ company, vertical }) => {
    const metadata = (company.analysisMetadata ??
      {}) as Partial<AnalysisMetadata>;
    const breakdown = scoreBreakdownSchema
      .catch(emptyBreakdown)
      .parse(metadata.breakdown);
    const companyEvidenceRows = evidenceByCompany.get(company.id) ?? [];
    const uniqueSources = Array.from(
      new Map(
        companyEvidenceRows.map(({ source }) => [source.id, source]),
      ).values(),
    );
    const scores = scoresByCompany.get(company.id) ?? new Map();
    const valuesByKind = (kind: string) =>
      companyEvidenceRows
        .filter(({ evidence }) => evidence.kind === kind)
        .map(({ evidence }) => evidence.content);

    return {
      id: company.id,
      name: company.name,
      tradeName: company.tradeName ?? undefined,
      domain: company.domain ?? "",
      vertical: vertical ?? "Não confirmado",
      subsegment: company.subsegment ?? "Não confirmado",
      coreBusiness: metadata.coreBusiness,
      classificationReason: metadata.classificationReason,
      classificationSourceUrl: metadata.classificationSourceUrl,
      city: company.city ?? "Não informado",
      state: company.state ?? "Não informado",
      country: company.country ?? "Brasil",
      size: company.size ?? "Não informado",
      employees: company.employeeRange ?? undefined,
      linkedinUrl: company.linkedinUrl ?? undefined,
      criteriaMatch: metadata.criteriaMatch,
      criteriaReason: metadata.criteriaReason,
      criteriaConfidence: metadata.criteriaConfidence,
      description: company.description ?? "Sem descrição disponível.",
      solution: company.suggestedSolution ?? "WAAP",
      score: company.score,
      apiScore: scores.get("API Security") ?? metadata.apiScore ?? 0,
      waapScore: scores.get("WAAP") ?? metadata.waapScore ?? 0,
      guardicoreScore:
        scores.get("Guardicore") ?? metadata.guardicoreScore ?? 0,
      breakdown,
      recommendation: company.recommendation ?? "Validar manualmente.",
      confirmedFacts: valuesByKind("fact"),
      commercialSignals: valuesByKind("signal"),
      hypotheses: valuesByKind("hypothesis"),
      sources: uniqueSources.map((source) => ({
        id: source.id,
        title: source.title,
        domain: source.domain,
        url: source.url,
        publishedAt: source.publishedAt?.toISOString(),
        accessedAt: source.accessedAt.toISOString().slice(0, 10),
        summary: source.summary,
      })),
      titles: metadata.titles ?? [],
      navigatorQuery: metadata.navigatorQuery ?? "",
      status: company.status,
      tags: metadata.tags ?? [],
      notes: company.notes ?? undefined,
      discoveredAt: dateInSaoPaulo(company.discoveredAt),
      reviewedAt: company.reviewedAt
        ? dateInSaoPaulo(company.reviewedAt)
        : undefined,
      demo: company.demo,
      possibleDuplicate: company.possibleDuplicate,
    } satisfies Company;
  });
}

export async function persistAnalyzedCompanies(
  candidates: AnalyzedCompany[],
  searchResults: SearchResult[],
  runId: string,
  criteria?: string,
) {
  const db = getDb();
  const [inventory, verticalRows] = await Promise.all([
    listCompanyInventory(),
    db.select({ id: verticals.id, name: verticals.name }).from(verticals),
  ]);
  const known = inventory.flatMap((item) =>
    [item.name, item.tradeName, ...item.aliases]
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ name, domain: item.domain })),
  );
  const verticalMap = new Map(verticalRows.map((row) => [row.name, row.id]));
  const resultByUrl = new Map(
    searchResults.map((result) => [result.url, result]),
  );
  let created = 0;
  let duplicateCount = 0;
  const employeeLimit = extractEmployeeLimit(criteria);

  for (const candidate of candidates) {
    const employeeUpperBound = extractEmployeeUpperBound(candidate.employees);
    if (
      (criteria && candidate.criteriaMatch === "incompatible") ||
      (employeeLimit &&
        employeeUpperBound &&
        employeeUpperBound > employeeLimit)
    )
      continue;
    if (
      !isValidVerticalClassification(
        candidate.vertical,
        candidate.subsegment,
      ) ||
      !verticalMap.has(candidate.vertical)
    )
      continue;
    const domain = normalizeDomain(candidate.domain);
    const duplicate = findDuplicate({ name: candidate.name, domain }, known);
    if (duplicate.duplicate) {
      duplicateCount += 1;
      continue;
    }
    const validEvidence = candidate.evidence.filter((item) =>
      resultByUrl.has(item.sourceUrl),
    );
    if (
      !domain ||
      !validEvidence.length ||
      !resultByUrl.has(candidate.classificationSourceUrl)
    )
      continue;
    const breakdown = scoreBreakdownSchema.parse(candidate.breakdown);
    const metadata: AnalysisMetadata = {
      apiScore: candidate.apiScore,
      waapScore: candidate.waapScore,
      guardicoreScore: candidate.guardicoreScore,
      breakdown,
      titles: candidate.titles,
      navigatorQuery: candidate.navigatorQuery,
      tags: candidate.tags,
      criteriaMatch:
        employeeLimit && !employeeUpperBound
          ? "uncertain"
          : candidate.criteriaMatch,
      criteriaReason: candidate.criteriaReason,
      criteriaConfidence: candidate.criteriaConfidence,
      coreBusiness: candidate.coreBusiness,
      classificationReason: candidate.classificationReason,
      classificationSourceUrl: candidate.classificationSourceUrl,
    };
    const linkedinUrl = verifiedLinkedInCompanyUrl(
      candidate.linkedinUrl,
      resultByUrl.keys(),
    );
    const [inserted] = await db
      .insert(companies)
      .values({
        name: candidate.name,
        tradeName: candidate.tradeName || null,
        normalizedName: normalizeName(candidate.name),
        domain,
        normalizedDomain: domain,
        verticalId: verticalMap.get(candidate.vertical),
        subsegment: candidate.subsegment,
        city: candidate.city || null,
        state: candidate.state || null,
        country: candidate.country,
        size: candidate.size,
        employeeRange: candidate.employees || null,
        linkedinUrl: linkedinUrl ?? null,
        description: candidate.description,
        suggestedSolution: candidate.solution,
        score: calculateScore(breakdown),
        recommendation: candidate.recommendation,
        status: "Nova",
        possibleDuplicate: duplicate.possible,
        demo: false,
        analysisMetadata: metadata,
        originRunId: runId,
      })
      .returning({ id: companies.id });
    if (!inserted) continue;

    const aliases = [candidate.tradeName]
      .filter(
        (alias) =>
          alias && normalizeName(alias) !== normalizeName(candidate.name),
      )
      .map((alias) => ({
        companyId: inserted.id,
        alias,
        normalizedAlias: normalizeName(alias),
      }));
    if (aliases.length)
      await db.insert(companyAliases).values(aliases).onConflictDoNothing();

    await db.insert(solutionScores).values([
      {
        companyId: inserted.id,
        solution: "API Security",
        score: candidate.apiScore,
        breakdown,
      },
      {
        companyId: inserted.id,
        solution: "WAAP",
        score: candidate.waapScore,
        breakdown,
      },
      {
        companyId: inserted.id,
        solution: "Guardicore",
        score: candidate.guardicoreScore,
        breakdown,
      },
    ]);

    for (const item of validEvidence) {
      const search = resultByUrl.get(item.sourceUrl)!;
      let [source] = await db
        .insert(sources)
        .values({
          title: search.title,
          domain: new URL(search.url).hostname.replace(/^www\./, ""),
          url: search.url,
          publishedAt: search.publishedAt ? new Date(search.publishedAt) : null,
          accessedAt: new Date(),
          summary: search.content.slice(0, 1500),
          rawMetadata: { provider: search.provider ?? "unknown" },
        })
        .onConflictDoNothing({ target: sources.url })
        .returning();
      if (!source) {
        [source] = await db
          .select()
          .from(sources)
          .where(eq(sources.url, search.url))
          .limit(1);
      }
      if (source)
        await db.insert(companyEvidence).values({
          companyId: inserted.id,
          sourceId: source.id,
          kind: item.kind,
          content: item.content,
        });
    }
    await db.insert(researchRunCompanies).values({
      runId,
      companyId: inserted.id,
      rank: created + 1,
    });
    known.push({ name: candidate.name, domain });
    created += 1;
  }
  return { created, duplicateCount };
}

export async function updateCompanyStatus(id: string, status: CompanyStatus) {
  const db = getDb();
  const [current] = await db
    .select({ status: companies.status })
    .from(companies)
    .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
    .limit(1);
  if (!current) return false;
  let userId: string | null = null;
  if (env.ADMIN_EMAIL) {
    const inserted = await db
      .insert(users)
      .values({ email: env.ADMIN_EMAIL, name: "Administrador" })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    if (inserted[0]) userId = inserted[0].id;
    else {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, env.ADMIN_EMAIL))
        .limit(1);
      userId = existing?.id ?? null;
    }
  }
  await db
    .update(companies)
    .set({ status, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(companies.id, id));
  await db.insert(companyStatusHistory).values({
    companyId: id,
    userId,
    previousStatus: current.status,
    newStatus: status,
  });
  return true;
}
