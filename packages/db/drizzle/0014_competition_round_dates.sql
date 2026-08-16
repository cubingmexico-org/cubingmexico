CREATE TABLE "competition_round_dates" (
	"competition_id" varchar(32) NOT NULL,
	"event_id" varchar(6) NOT NULL,
	"round_type_id" varchar(1) NOT NULL,
	"end_date" date NOT NULL,
	"source" varchar(16) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_round_dates_competition_id_event_id_round_type_id_pk" PRIMARY KEY("competition_id","event_id","round_type_id")
);
--> statement-breakpoint
ALTER TABLE "competition_round_dates" ADD CONSTRAINT "competition_round_dates_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_round_dates" ADD CONSTRAINT "competition_round_dates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_round_dates" ADD CONSTRAINT "competition_round_dates_round_type_id_round_types_id_fk" FOREIGN KEY ("round_type_id") REFERENCES "public"."round_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comp_round_dates_comp_idx" ON "competition_round_dates" USING btree ("competition_id");
