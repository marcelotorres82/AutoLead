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
export const scoringProfiles = pgTable(
  "scoring_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    verticalName: text("vertical_name"),
    solution: solutionEnum("solution"),
    weights: jsonb("weights").$type<Record<string, number>>().notNull(),
    evidenceRequirements: jsonb("evidence_requirements")
      .$type<Record<string, number>>()
      .notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("scoring_profiles_name_version_uq").on(t.name, t.version),
    index("scoring_profiles_lookup_idx").on(
      t.verticalName,
      t.solution,
      t.active,
    ),
  ],
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
    lastSuggestedAt: timestamp("last_suggested_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    timesSuggested: integer("times_suggested").notNull().default(0),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    qualificationStatus: text("qualification_status")
      .notNull()
      .default("NEEDS_RESEARCH"),
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
export const researchStageRuns = pgTable(
  "research_stage_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchRunId: uuid("research_run_id")
      .notNull()
      .references(() => researchRuns.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "cascade",
    }),
    stage: text("stage").notNull(),
    status: text("status").notNull().default("PENDING"),
    attempt: integer("attempt").notNull().default(1),
    inputHash: text("input_hash"),
    outputReference: text("output_reference"),
    provider: text("provider"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCost: numeric("estimated_cost", {
      precision: 12,
      scale: 6,
    })
      .notNull()
      .default("0"),
    durationMs: integer("duration_ms"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryAt: timestamp("retry_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("research_stage_run_attempt_uq").on(
      t.researchRunId,
      t.companyId,
      t.stage,
      t.attempt,
    ),
    index("research_stage_run_status_idx").on(t.status, t.retryAt),
    index("research_stage_run_company_idx").on(t.companyId, t.startedAt),
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
export const sourceFetches = pgTable(
  "source_fetches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    researchRunId: uuid("research_run_id").references(() => researchRuns.id, {
      onDelete: "set null",
    }),
    requestedUrl: text("requested_url").notNull(),
    finalUrl: text("final_url").notNull(),
    category: text("category").notNull().default("other"),
    statusCode: integer("status_code"),
    mimeType: text("mime_type"),
    contentHash: text("content_hash").notNull(),
    contentLength: integer("content_length").notNull().default(0),
    title: text("title"),
    excerpt: text("excerpt"),
    fetchDurationMs: integer("fetch_duration_ms"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("source_fetch_company_hash_uq").on(
      t.companyId,
      t.finalUrl,
      t.contentHash,
    ),
    index("source_fetch_company_date_idx").on(t.companyId, t.fetchedAt),
  ],
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
    evidenceType: text("evidence_type").notNull().default("other"),
    statementKind: text("statement_kind").notNull().default("FACT"),
    excerpt: text("excerpt"),
    confidence: integer("confidence").notNull().default(0),
    sourceQuality: integer("source_quality").notNull().default(0),
    freshnessScore: integer("freshness_score").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    relevantSolutions: jsonb("relevant_solutions")
      .$type<string[]>()
      .notNull()
      .default([]),
    collectedAt: timestamp("collected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (t) => [index("evidence_company_idx").on(t.companyId)],
);
export const evidenceVersions = pgTable(
  "evidence_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => companyEvidence.id, { onDelete: "cascade" }),
    sourceFetchId: uuid("source_fetch_id").references(() => sourceFetches.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    contentHash: text("content_hash").notNull(),
    claim: text("claim").notNull(),
    excerpt: text("excerpt"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("evidence_version_uq").on(t.evidenceId, t.version),
    index("evidence_version_status_idx").on(t.status),
  ],
);
export const technicalSignals = pgTable(
  "technical_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    value: text("value").notNull(),
    sourceUrl: text("source_url").notNull(),
    detectionMethod: text("detection_method").notNull(),
    confidence: integer("confidence").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("technical_signals_company_idx").on(t.companyId),
    uniqueIndex("technical_signals_company_value_source_uq").on(
      t.companyId,
      t.value,
      t.sourceUrl,
    ),
  ],
);
export const opportunityScores = pgTable(
  "opportunity_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    digitalExposureScore: integer("digital_exposure_score").notNull(),
    waapScore: integer("waap_score").notNull(),
    apiSecurityScore: integer("api_security_score").notNull(),
    guardicoreScore: integer("guardicore_score").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    opportunityScore: integer("opportunity_score").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    independentSourceCount: integer("independent_source_count").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    scoringProfileId: uuid("scoring_profile_id").references(
      () => scoringProfiles.id,
      { onDelete: "set null" },
    ),
    scoringProfileVersion: text("scoring_profile_version")
      .notNull()
      .default("default-v1"),
    breakdown: jsonb("breakdown").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("opportunity_scores_company_uq").on(t.companyId)],
);
export const sdrIntelligence = pgTable(
  "sdr_intelligence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    researchRunId: uuid("research_run_id").references(() => researchRuns.id, {
      onDelete: "set null",
    }),
    recommendedSolution: text("recommended_solution").notNull(),
    whyNow: text("why_now").notNull(),
    callOpening: text("call_opening").notNull(),
    discoveryQuestions: jsonb("discovery_questions")
      .$type<string[]>()
      .notNull(),
    likelyChallenges: jsonb("likely_challenges").$type<string[]>().notNull(),
    relevantEvidenceIds: jsonb("relevant_evidence_ids")
      .$type<string[]>()
      .notNull(),
    recommendedPersonas: jsonb("recommended_personas")
      .$type<string[]>()
      .notNull(),
    hypothesis: text("hypothesis").notNull(),
    confidence: integer("confidence").notNull(),
    ...timestamps,
  },
  (t) => [index("sdr_intelligence_company_idx").on(t.companyId)],
);
export const dailyLeadQueue = pgTable(
  "daily_lead_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queueDate: date("queue_date").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    rank: integer("rank").notNull(),
    status: text("status").notNull().default("READY"),
    opportunityScore: integer("opportunity_score").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    recommendedSolution: text("recommended_solution").notNull(),
    whyNow: text("why_now"),
    claimedBy: text("claimed_by"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    outcome: text("outcome"),
    outcomeNote: text("outcome_note"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("daily_lead_queue_date_company_uq").on(
      t.queueDate,
      t.companyId,
    ),
    index("daily_lead_queue_date_rank_idx").on(t.queueDate, t.rank),
  ],
);
export const evidenceAudits = pgTable(
  "evidence_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    researchRunId: uuid("research_run_id").references(() => researchRuns.id, {
      onDelete: "set null",
    }),
    auditType: text("audit_type").notNull(),
    status: text("status").notNull(),
    score: integer("score").notNull(),
    issues: jsonb("issues").$type<string[]>().notNull().default([]),
    sampled: boolean("sampled").notNull().default(false),
    metadata: jsonb("metadata"),
    ...timestamps,
  },
  (t) => [
    index("evidence_audit_company_idx").on(t.companyId, t.createdAt),
    index("evidence_audit_status_idx").on(t.status),
  ],
);
export const crmOutbox = pgTable(
  "crm_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    destination: text("destination").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING_APPROVAL"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("crm_outbox_idempotency_uq").on(t.idempotencyKey),
    index("crm_outbox_status_idx").on(t.status, t.createdAt),
  ],
);
export const researchCache = pgTable(
  "research_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cacheKey: text("cache_key").notNull(),
    kind: text("kind").notNull(),
    value: jsonb("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("research_cache_key_uq").on(t.cacheKey),
    index("research_cache_expiry_idx").on(t.expiresAt),
  ],
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
    sourceUrl: text("source_url"),
    sourceTitle: text("source_title"),
    evidence: text("evidence"),
    confidence: integer("confidence"),
    employmentStatus: text("employment_status"),
    reviewStatus: text("review_status")
      .notNull()
      .default("Pendente de validação"),
    originRunId: uuid("origin_run_id").references(() => researchRuns.id, {
      onDelete: "set null",
    }),
    researchedAt: timestamp("researched_at", { withTimezone: true }),
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
  (t) => [
    index("personas_company_idx").on(t.companyId),
    index("personas_review_status_idx").on(t.reviewStatus),
    index("personas_origin_run_idx").on(t.originRunId),
  ],
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
