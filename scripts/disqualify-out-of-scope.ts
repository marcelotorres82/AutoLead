import "./load-next-env";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, dailyLeadQueue, verticals } from "@/db/schema";
import {
  isForbiddenSectorCompany,
  isValidVerticalClassification,
} from "@/lib/domain";

const apply = process.argv.includes("--apply");
const db = getDb();
const rows = await db
  .select({
    id: companies.id,
    name: companies.name,
    tradeName: companies.tradeName,
    domain: companies.domain,
    vertical: verticals.name,
    verticalActive: verticals.active,
    subsegment: companies.subsegment,
    description: companies.description,
    analysisMetadata: companies.analysisMetadata,
    notes: companies.notes,
  })
  .from(companies)
  .leftJoin(verticals, eq(verticals.id, companies.verticalId))
  .where(isNull(companies.deletedAt));

type CompanyRow = (typeof rows)[number];
type Finding = {
  action: "DISQUALIFY" | "RECLASSIFY";
  company: CompanyRow;
  reason: string;
};

const findings = rows.flatMap<Finding>((company): Finding[] => {
  const metadata =
    company.analysisMetadata && typeof company.analysisMetadata === "object"
      ? (company.analysisMetadata as Record<string, unknown>)
      : {};
  const text = (key: string) =>
    typeof metadata[key] === "string" ? metadata[key] : undefined;
  const sector = isForbiddenSectorCompany({
    name: company.name,
    tradeName: company.tradeName ?? undefined,
    domain: company.domain ?? undefined,
    coreBusiness: text("coreBusiness"),
    description: company.description ?? undefined,
    classificationReason: text("classificationReason"),
  });

  if (sector.forbidden || company.subsegment === "Consultoria e serviços de TI")
    return [
      {
        action: "DISQUALIFY" as const,
        company,
        reason:
          sector.reason ??
          "Subvertical de consultoria e serviços de TI removida do escopo comercial.",
      },
    ];

  if (
    !company.vertical ||
    !company.verticalActive ||
    !company.subsegment ||
    !isValidVerticalClassification(company.vertical, company.subsegment)
  )
    return [
      {
        action: "RECLASSIFY" as const,
        company,
        reason:
          "Vertical ou subvertical ausente, inativa ou fora da taxonomia comercial atual.",
      },
    ];

  return [];
});

const rejected = findings.filter((item) => item.action === "DISQUALIFY");
const needsReclassification = findings.filter(
  (item) => item.action === "RECLASSIFY",
);

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      scanned: rows.length,
      rejected: rejected.length,
      quarantinedByQueueFilter: needsReclassification.length,
      rejectedCompanies: rejected.map(({ company, reason }) => ({
        id: company.id,
        name: company.name,
        vertical: company.vertical,
        subsegment: company.subsegment,
        reason,
      })),
      reclassificationSample: needsReclassification
        .slice(0, 20)
        .map(({ company }) => ({
          id: company.id,
          name: company.name,
          vertical: company.vertical,
          subsegment: company.subsegment,
        })),
    },
    null,
    2,
  ),
);

if (apply) {
  const now = new Date();
  for (const { company, reason } of rejected) {
    const auditNote = `[Filtro automático de escopo] ${reason}`;
    const notes = company.notes?.includes(auditNote)
      ? company.notes
      : [company.notes, auditNote].filter(Boolean).join("\n");

    await db
      .update(companies)
      .set({
        status: "Sem aderência",
        qualificationStatus: "DISQUALIFIED",
        notes,
        updatedAt: now,
      })
      .where(eq(companies.id, company.id));

    await db
      .update(dailyLeadQueue)
      .set({
        status: "DISMISSED",
        outcome: "OUT_OF_SCOPE",
        outcomeNote: reason,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(dailyLeadQueue.companyId, company.id),
          inArray(dailyLeadQueue.status, ["READY", "CLAIMED", "SNOOZED"]),
        ),
      );
  }
}
