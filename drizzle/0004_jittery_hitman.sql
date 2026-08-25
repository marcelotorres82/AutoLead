CREATE TABLE "crm_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"destination" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"research_run_id" uuid,
	"audit_type" text NOT NULL,
	"status" text NOT NULL,
	"score" integer NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sampled" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"source_fetch_id" uuid,
	"version" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"content_hash" text NOT NULL,
	"claim" text NOT NULL,
	"excerpt" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_stage_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_run_id" uuid NOT NULL,
	"company_id" uuid,
	"stage" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"input_hash" text,
	"output_reference" text,
	"provider" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" numeric(12, 6) DEFAULT '0' NOT NULL,
	"duration_ms" integer,
	"error_code" text,
	"error_message" text,
	"retry_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"vertical_name" text,
	"solution" "solution",
	"weights" jsonb NOT NULL,
	"evidence_requirements" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"research_run_id" uuid,
	"requested_url" text NOT NULL,
	"final_url" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"status_code" integer,
	"mime_type" text,
	"content_hash" text NOT NULL,
	"content_length" integer DEFAULT 0 NOT NULL,
	"title" text,
	"excerpt" text,
	"fetch_duration_ms" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_lead_queue" ADD COLUMN "claimed_by" text;--> statement-breakpoint
ALTER TABLE "daily_lead_queue" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_lead_queue" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_lead_queue" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "daily_lead_queue" ADD COLUMN "outcome_note" text;--> statement-breakpoint
ALTER TABLE "opportunity_scores" ADD COLUMN "scoring_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "opportunity_scores" ADD COLUMN "scoring_profile_version" text DEFAULT 'default-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_outbox" ADD CONSTRAINT "crm_outbox_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_audits" ADD CONSTRAINT "evidence_audits_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_audits" ADD CONSTRAINT "evidence_audits_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_versions" ADD CONSTRAINT "evidence_versions_evidence_id_company_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."company_evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_versions" ADD CONSTRAINT "evidence_versions_source_fetch_id_source_fetches_id_fk" FOREIGN KEY ("source_fetch_id") REFERENCES "public"."source_fetches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_stage_runs" ADD CONSTRAINT "research_stage_runs_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "public"."research_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_stage_runs" ADD CONSTRAINT "research_stage_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fetches" ADD CONSTRAINT "source_fetches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fetches" ADD CONSTRAINT "source_fetches_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_outbox_idempotency_uq" ON "crm_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "crm_outbox_status_idx" ON "crm_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "evidence_audit_company_idx" ON "evidence_audits" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_audit_status_idx" ON "evidence_audits" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_version_uq" ON "evidence_versions" USING btree ("evidence_id","version");--> statement-breakpoint
CREATE INDEX "evidence_version_status_idx" ON "evidence_versions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "research_stage_run_attempt_uq" ON "research_stage_runs" USING btree ("research_run_id","company_id","stage","attempt");--> statement-breakpoint
CREATE INDEX "research_stage_run_status_idx" ON "research_stage_runs" USING btree ("status","retry_at");--> statement-breakpoint
CREATE INDEX "research_stage_run_company_idx" ON "research_stage_runs" USING btree ("company_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_profiles_name_version_uq" ON "scoring_profiles" USING btree ("name","version");--> statement-breakpoint
CREATE INDEX "scoring_profiles_lookup_idx" ON "scoring_profiles" USING btree ("vertical_name","solution","active");--> statement-breakpoint
CREATE UNIQUE INDEX "source_fetch_company_hash_uq" ON "source_fetches" USING btree ("company_id","final_url","content_hash");--> statement-breakpoint
CREATE INDEX "source_fetch_company_date_idx" ON "source_fetches" USING btree ("company_id","fetched_at");--> statement-breakpoint
ALTER TABLE "opportunity_scores" ADD CONSTRAINT "opportunity_scores_scoring_profile_id_scoring_profiles_id_fk" FOREIGN KEY ("scoring_profile_id") REFERENCES "public"."scoring_profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "scoring_profiles" (
	"name", "version", "vertical_name", "solution", "weights", "evidence_requirements"
) VALUES (
	'Evidence First padrão',
	'prospect-v2.0',
	NULL,
	NULL,
	'{"digitalExposure":1,"API Security":1,"WAAP":1,"Guardicore":1}'::jsonb,
	'{"minimumEvidence":3,"minimumIndependentSources":1,"minimumConfidence":70}'::jsonb
) ON CONFLICT ("name", "version") DO NOTHING;
