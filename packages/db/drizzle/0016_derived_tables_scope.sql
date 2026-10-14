ALTER TABLE "kinch_ranks" ADD COLUMN "scope" varchar(8) DEFAULT 'official' NOT NULL;--> statement-breakpoint
ALTER TABLE "nemesis_stats" ADD COLUMN "scope" varchar(8) DEFAULT 'official' NOT NULL;--> statement-breakpoint
ALTER TABLE "streak_ranks" ADD COLUMN "scope" varchar(8) DEFAULT 'official' NOT NULL;--> statement-breakpoint
ALTER TABLE "sum_of_ranks" ADD COLUMN "scope" varchar(8) DEFAULT 'official' NOT NULL;--> statement-breakpoint
DROP INDEX "nemesis_stats_nemesis_count_idx";--> statement-breakpoint
DROP INDEX "nemesis_stats_nemesized_count_idx";--> statement-breakpoint
ALTER TABLE "kinch_ranks" DROP CONSTRAINT "kinch_ranks_person_id_pk";--> statement-breakpoint
ALTER TABLE "nemesis_stats" DROP CONSTRAINT "nemesis_stats_person_id_pk";--> statement-breakpoint
ALTER TABLE "streak_ranks" DROP CONSTRAINT "streak_ranks_person_id_pk";--> statement-breakpoint
ALTER TABLE "sum_of_ranks" DROP CONSTRAINT "sum_of_ranks_person_id_result_type_pk";--> statement-breakpoint
ALTER TABLE "kinch_ranks" ADD CONSTRAINT "kinch_ranks_person_id_scope_pk" PRIMARY KEY("person_id","scope");--> statement-breakpoint
ALTER TABLE "nemesis_stats" ADD CONSTRAINT "nemesis_stats_person_id_scope_pk" PRIMARY KEY("person_id","scope");--> statement-breakpoint
ALTER TABLE "streak_ranks" ADD CONSTRAINT "streak_ranks_person_id_scope_pk" PRIMARY KEY("person_id","scope");--> statement-breakpoint
ALTER TABLE "sum_of_ranks" ADD CONSTRAINT "sum_of_ranks_person_id_result_type_scope_pk" PRIMARY KEY("person_id","result_type","scope");--> statement-breakpoint
CREATE INDEX "nemesis_stats_nemesis_count_idx" ON "nemesis_stats" USING btree ("scope","nemesis_count");--> statement-breakpoint
CREATE INDEX "nemesis_stats_nemesized_count_idx" ON "nemesis_stats" USING btree ("scope","nemesized_count");
