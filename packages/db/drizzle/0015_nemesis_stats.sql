CREATE TABLE "nemesis_stats" (
	"person_id" varchar(10) NOT NULL,
	"nemesis_count" integer DEFAULT 0 NOT NULL,
	"nemesized_count" integer DEFAULT 0 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"slot_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "nemesis_stats_person_id_pk" PRIMARY KEY("person_id")
);
--> statement-breakpoint
ALTER TABLE "nemesis_stats" ADD CONSTRAINT "nemesis_stats_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nemesis_stats_nemesis_count_idx" ON "nemesis_stats" USING btree ("nemesis_count");--> statement-breakpoint
CREATE INDEX "nemesis_stats_nemesized_count_idx" ON "nemesis_stats" USING btree ("nemesized_count");
