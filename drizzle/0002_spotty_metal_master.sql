ALTER TABLE "personas" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "source_title" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "evidence" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "confidence" integer;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "employment_status" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "review_status" text DEFAULT 'Pendente de validação' NOT NULL;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "origin_run_id" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "researched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_origin_run_id_research_runs_id_fk" FOREIGN KEY ("origin_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personas_review_status_idx" ON "personas" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "personas_origin_run_idx" ON "personas" USING btree ("origin_run_id");