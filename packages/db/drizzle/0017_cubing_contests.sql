CREATE TABLE "cc_events" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"format" varchar(10) NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"participants" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cc_persons" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"region_code" varchar(2),
	"wca_id" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "cc_results" (
	"id" integer PRIMARY KEY NOT NULL,
	"competition_id" varchar(32) NOT NULL,
	"event_id" varchar(32) NOT NULL,
	"round_type_id" varchar(1),
	"round_number" smallint DEFAULT 1 NOT NULL,
	"format_id" varchar(1) NOT NULL,
	"pos" smallint,
	"best" integer DEFAULT 0 NOT NULL,
	"average" integer DEFAULT 0 NOT NULL,
	"attempts" integer[] NOT NULL,
	"date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cc_result_persons" (
	"result_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "cc_result_persons_result_id_person_id_pk" PRIMARY KEY("result_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "cc_results" ADD CONSTRAINT "cc_results_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cc_results" ADD CONSTRAINT "cc_results_event_id_cc_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."cc_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cc_result_persons" ADD CONSTRAINT "cc_result_persons_result_id_cc_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."cc_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cc_result_persons" ADD CONSTRAINT "cc_result_persons_person_id_cc_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."cc_persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cc_persons_wca_id_idx" ON "cc_persons" USING btree ("wca_id");--> statement-breakpoint
CREATE INDEX "cc_results_comp_event_idx" ON "cc_results" USING btree ("competition_id","event_id");--> statement-breakpoint
CREATE INDEX "cc_result_persons_person_idx" ON "cc_result_persons" USING btree ("person_id");