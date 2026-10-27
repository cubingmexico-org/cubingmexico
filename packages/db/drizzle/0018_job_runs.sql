CREATE TABLE "job_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"job" varchar(40) NOT NULL,
	"status" varchar(12) NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resumed_from" varchar(36),
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "job_runs_job_started_idx" ON "job_runs" USING btree ("job","started_at");