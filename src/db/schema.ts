import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companyStatuses, solutions } from "@/lib/domain";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};
export const companyStatusEnum = pgEnum("company_status", companyStatuses);
export const solutionEnum = pgEnum("solution", solutions);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default("Administrador"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);
export const verticals = pgTable(
  "verticals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("verticals_name_uq").on(t.name)],
);
export const researchRuns = pgTable(
  "research_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runDate: date("run_date").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    provider: text("provider"),
    model: text("model"),
    searchCount: integer("search_count").default(0),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
    estimatedCost: numeric("estimated_cost", {
      precision: 12,
      scale: 6,
    }).default("0"),
    durationMs: integer("duration_ms"),
    foundCount: integer("found_count").default(0),
    duplicateCount: integer("duplicate_count").default(0),
    retries: integer("retries").default(0),
    errors: jsonb("errors").$type<string[]>().default([]),
    metadata: jsonb("metadata"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("research_runs_daily_kind_uq").on(t.runDate, t.kind),
    index("research_runs_date_idx").on(t.runDate),
  ],
);
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    tradeName: text("trade_name"),
    normalizedName: text("normalized_name").notNull(),
    domain: text("domain"),
    normalizedDomain: text("normalized_domain"),
    cnpj: text("cnpj"),
    linkedinUrl: text("linkedin_url"),
    verticalId: uuid("vertical_id").references(() => verticals.id, {
      onDelete: "restrict",
    }),
    subsegment: text("subsegment"),
    city: text("city"),
    state: text("state"),
    country: text("country").default("Brasil"),
    size: text("size"),
    employeeRange: text("employee_range"),
    description: text("description"),
    suggestedSolution: solutionEnum("suggested_solution"),
    score: integer("score").notNull().default(0),
    scoreEditedByHuman: boolean("score_edited_by_human")
      .notNull()
      .default(false),
    recommendation: text("recommendation"),
    status: companyStatusEnum("status").notNull().default("Nova"),
    notes: text("notes"),
    analysisMetadata: jsonb("analysis_metadata"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    exclusionUntil: date("exclusion_until"),
    possibleDuplicate: boolean("possible_duplicate").notNull().default(false),
    demo: boolean("demo").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    originRunId: uuid("origin_run_id").references(() => researchRuns.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("companies_domain_idx").on(t.normalizedDomain),
    index("companies_name_idx").on(t.normalizedName),
    index("companies_status_idx").on(t.status),
    index("companies_vertical_idx").on(t.verticalId),
    index("companies_score_idx").on(t.score),
    uniqueIndex("companies_cnpj_uq").on(t.cnpj),
  ],
);
export const companyAliases = pgTable(
  "company_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("company_alias_uq").on(t.companyId, t.normalizedAlias)],
);
export const researchRunCompanies = pgTable(
  "research_run_companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => researchRuns.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    rank: integer("rank"),
    ...timestamps,
  },
  (t) => [uniqueIndex("run_company_uq").on(t.runId, t.companyId)],
);
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    domain: text("domain").notNull(),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull(),
    summary: text("summary").notNull(),
    rawMetadata: jsonb("raw_metadata"),
    ...timestamps,
  },
  (t) => [uniqueIndex("sources_url_uq").on(t.url)],
);
export const companyEvidence = pgTable(
  "company_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    content: text("content").notNull(),
    ...timestamps,
  },
  (t) => [index("evidence_company_idx").on(t.companyId)],
);
export const solutionScores = pgTable(
  "solution_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    solution: solutionEnum("solution").notNull(),
    score: integer("score").notNull(),
    breakdown: jsonb("breakdown").notNull(),
    editedByHuman: boolean("edited_by_human").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("company_solution_score_uq").on(t.companyId, t.solution)],
);
export const companyStatusHistory = pgTable(
  "company_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    previousStatus: companyStatusEnum("previous_status"),
    newStatus: companyStatusEnum("new_status").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    index("status_history_company_idx").on(t.companyId),
    index("status_history_date_idx").on(t.createdAt),
  ],
);
export const personas = pgTable(
  "personas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    title: text("title").notNull(),
    profileUrl: text("profile_url"),
    seniority: text("seniority"),
    area: text("area"),
    solution: solutionEnum("solution"),
    priority: integer("priority").default(2),
    role: text("role"),
    contactObtained: boolean("contact_obtained").default(false),
    lushaCreditUsed: boolean("lusha_credit_used").default(false),
    sentToSalesloft: boolean("sent_to_salesloft").default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("personas_company_idx").on(t.companyId)],
);
export const lushaUsage = pgTable(
  "lusha_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    month: date("month").notNull(),
    limit: integer("limit").notNull().default(300),
    used: integer("used").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("lusha_month_uq").on(t.month)],
);
export const backups = pgTable(
  "backups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blobPath: text("blob_path").notNull(),
    sha256: text("sha256").notNull(),
    size: integer("size").notNull(),
    recordCount: integer("record_count").notNull(),
    status: text("status").notNull(),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("backups_path_uq").on(t.blobPath),
    index("backups_date_idx").on(t.createdAt),
  ],
);
export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("settings_key_uq").on(t.key)],
);
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    ipHash: text("ip_hash"),
    ...timestamps,
  },
  (t) => [index("audit_date_idx").on(t.createdAt)],
);
