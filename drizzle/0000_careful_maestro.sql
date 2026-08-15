CREATE TYPE "public"."company_status" AS ENUM('Nova', 'Pendente de validação', 'Aprovada para pesquisar leads', 'Já é cliente', 'Conta em atendimento', 'Oportunidade recente', 'Ex-cliente recente', 'Pausada', 'Sem aderência', 'Duplicada', 'Descartada', 'Revisar depois');--> statement-breakpoint
CREATE TYPE "public"."solution" AS ENUM('API Security', 'WAAP', 'Guardicore');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blob_path" text NOT NULL,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"record_count" integer NOT NULL,
	"status" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trade_name" text,
	"normalized_name" text NOT NULL,
	"domain" text,
	"normalized_domain" text,
	"cnpj" text,
	"linkedin_url" text,
	"vertical_id" uuid,
	"subsegment" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'Brasil',
	"size" text,
	"employee_range" text,
	"description" text,
	"suggested_solution" "solution",
	"score" integer DEFAULT 0 NOT NULL,
	"score_edited_by_human" boolean DEFAULT false NOT NULL,
	"recommendation" text,
	"status" "company_status" DEFAULT 'Nova' NOT NULL,
	"notes" text,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"exclusion_until" date,
	"possible_duplicate" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"origin_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"previous_status" "company_status",
	"new_status" "company_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lusha_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" date NOT NULL,
	"limit" integer DEFAULT 300 NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"profile_url" text,
	"seniority" text,
	"area" text,
	"solution" "solution",
	"priority" integer DEFAULT 2,
	"role" text,
	"contact_obtained" boolean DEFAULT false,
	"lusha_credit_used" boolean DEFAULT false,
	"sent_to_salesloft" boolean DEFAULT false,
	"sent_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_run_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_date" date NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"provider" text,
	"model" text,
	"search_count" integer DEFAULT 0,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"estimated_cost" numeric(12, 6) DEFAULT '0',
	"duration_ms" integer,
	"found_count" integer DEFAULT 0,
	"duplicate_count" integer DEFAULT 0,
	"retries" integer DEFAULT 0,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"solution" "solution" NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"edited_by_human" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone,
	"accessed_at" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"raw_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT 'Administrador' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verticals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_vertical_id_verticals_id_fk" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_origin_run_id_research_runs_id_fk" FOREIGN KEY ("origin_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD CONSTRAINT "company_evidence_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_evidence" ADD CONSTRAINT "company_evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_run_companies" ADD CONSTRAINT "research_run_companies_run_id_research_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."research_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_run_companies" ADD CONSTRAINT "research_run_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_scores" ADD CONSTRAINT "solution_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_date_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "backups_path_uq" ON "backups" USING btree ("blob_path");--> statement-breakpoint
CREATE INDEX "backups_date_idx" ON "backups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "companies_domain_idx" ON "companies" USING btree ("normalized_domain");--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "companies_vertical_idx" ON "companies" USING btree ("vertical_id");--> statement-breakpoint
CREATE INDEX "companies_score_idx" ON "companies" USING btree ("score");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_cnpj_uq" ON "companies" USING btree ("cnpj");--> statement-breakpoint
CREATE UNIQUE INDEX "company_alias_uq" ON "company_aliases" USING btree ("company_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "evidence_company_idx" ON "company_evidence" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "status_history_company_idx" ON "company_status_history" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "status_history_date_idx" ON "company_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lusha_month_uq" ON "lusha_usage" USING btree ("month");--> statement-breakpoint
CREATE INDEX "personas_company_idx" ON "personas" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "run_company_uq" ON "research_run_companies" USING btree ("run_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_runs_daily_kind_uq" ON "research_runs" USING btree ("run_date","kind");--> statement-breakpoint
CREATE INDEX "research_runs_date_idx" ON "research_runs" USING btree ("run_date");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_uq" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "company_solution_score_uq" ON "solution_scores" USING btree ("company_id","solution");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_url_uq" ON "sources" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verticals_name_uq" ON "verticals" USING btree ("name");