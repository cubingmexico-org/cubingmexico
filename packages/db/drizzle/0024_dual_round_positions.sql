ALTER TABLE "results" ADD COLUMN "global_pos" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "is_dual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "results" SET "global_pos" = COALESCE("pos", 0);
