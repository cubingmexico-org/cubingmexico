ALTER TABLE "formats" ADD COLUMN "trim_fastest_n" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "formats" ADD COLUMN "trim_slowest_n" boolean DEFAULT false NOT NULL;