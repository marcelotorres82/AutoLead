CREATE TABLE "daily_lead_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_date" date NOT NULL,
	"company_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"status" text DEFAULT 'READY' NOT NULL,
	"opportunity_score" integer NOT NULL,
	"confidence_score" integer NOT NULL,
	"recommended_solution" text NOT NULL,
	"why_now" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"digital_exposure_score" integer NOT NULL,
	"waap_score" integer NOT NULL,
	"api_security_score" integer NOT NULL,
	"guardicore_score" integer NOT NULL,
	"confidence_score" integer NOT NULL,
	"opportunity_score" integer NOT NULL,
	"evidence_count" integer NOT NULL,
	"independent_source_count" integer NOT NULL,
	"algorithm_version" text NOT NULL,
	"breakdown" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"kind" text NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdr_intelligence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"research_run_id" uuid,
	"recommended_solution" text NOT NULL,
	"why_now" text NOT NULL,
	"call_opening" text NOT NULL,
	"discovery_questions" jsonb NOT NULL,
	"likely_challenges" jsonb NOT NULL,
	"relevant_evidence_ids" jsonb NOT NULL,
	"recommended_personas" jsonb NOT NULL,
	"hypothesis" text NOT NULL,
	"confidence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technical_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"source_url" text NOT NULL,
	"detection_method" text NOT NULL,
	"confidence" integer NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "last_suggested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "last_contacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "times_suggested" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "cooldown_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "qualification_status" text DEFAULT 'NEEDS_RESEARCH' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "evidence_type" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "statement_kind" text DEFAULT 'FACT' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "excerpt" text;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "confidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "source_quality" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "freshness_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "relevant_solutions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD COLUMN "collected_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_lead_queue" ADD CONSTRAINT "daily_lead_queue_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_scores" ADD CONSTRAINT "opportunity_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_intelligence" ADD CONSTRAINT "sdr_intelligence_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdr_intelligence" ADD CONSTRAINT "sdr_intelligence_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_signals" ADD CONSTRAINT "technical_signals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_lead_queue_date_company_uq" ON "daily_lead_queue" USING btree ("queue_date","company_id");--> statement-breakpoint
CREATE INDEX "daily_lead_queue_date_rank_idx" ON "daily_lead_queue" USING btree ("queue_date","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_scores_company_uq" ON "opportunity_scores" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_cache_key_uq" ON "research_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "research_cache_expiry_idx" ON "research_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sdr_intelligence_company_idx" ON "sdr_intelligence" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "technical_signals_company_idx" ON "technical_signals" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "technical_signals_company_value_source_uq" ON "technical_signals" USING btree ("company_id","value","source_url");