CREATE TABLE "championships" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"competition_id" varchar(32) NOT NULL,
	"championship_type" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"information" text,
	"external_website" varchar(200),
	"venue" varchar(240) NOT NULL,
	"city_name" varchar(50) NOT NULL,
	"country_id" varchar(50) NOT NULL,
	"venue_address" varchar(191),
	"venue_details" varchar(191),
	"cell_name" varchar(45) NOT NULL,
	"cancelled" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"latitude_microdegrees" integer,
	"longitude_microdegrees" integer,
	"state_id" varchar(3)
);
--> statement-breakpoint
CREATE TABLE "competition_delegates" (
	"competition_id" varchar(32) NOT NULL,
	"delegate_id" varchar(128) NOT NULL,
	CONSTRAINT "competition_delegates_competition_id_delegate_id_pk" PRIMARY KEY("competition_id","delegate_id")
);
--> statement-breakpoint
CREATE TABLE "competition_events" (
	"competition_id" varchar(32) NOT NULL,
	"event_id" varchar(6) NOT NULL,
	CONSTRAINT "competition_events_competition_id_event_id_pk" PRIMARY KEY("competition_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "competition_organizers" (
	"competition_id" varchar(32) NOT NULL,
	"organizer_id" varchar(128) NOT NULL,
	CONSTRAINT "competition_organizers_competition_id_organizer_id_pk" PRIMARY KEY("competition_id","organizer_id")
);
--> statement-breakpoint
CREATE TABLE "delegates" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(6) PRIMARY KEY NOT NULL,
	"format" varchar(10) NOT NULL,
	"name" varchar(54) NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_metadata" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "formats" (
	"id" varchar(1) PRIMARY KEY NOT NULL,
	"expected_solve_count" smallint DEFAULT 0 NOT NULL,
	"name" varchar(50) NOT NULL,
	"sort_by" varchar(10) NOT NULL,
	"sort_by_second" varchar(10),
	"trim_fastest_n" smallint,
	"trim_slowest_n" smallint
);
--> statement-breakpoint
CREATE TABLE "kinch_ranks" (
	"rank" integer NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"overall" double precision NOT NULL,
	"events" jsonb NOT NULL,
	CONSTRAINT "kinch_ranks_person_id_pk" PRIMARY KEY("person_id")
);
--> statement-breakpoint
CREATE TABLE "organizers" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"person_id" varchar(10),
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"wca_id" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(80),
	"gender" varchar(1),
	"state_id" varchar(3)
);
--> statement-breakpoint
CREATE TABLE "ranks_average" (
	"best" integer DEFAULT 0 NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"event_id" varchar(6) NOT NULL,
	"world_rank" integer DEFAULT 0 NOT NULL,
	"continent_rank" integer DEFAULT 0 NOT NULL,
	"country_rank" integer DEFAULT 0 NOT NULL,
	"state_rank" integer,
	CONSTRAINT "ranks_average_person_id_event_id_pk" PRIMARY KEY("person_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "ranks_single" (
	"best" integer DEFAULT 0 NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"event_id" varchar(6) NOT NULL,
	"world_rank" integer DEFAULT 0 NOT NULL,
	"continent_rank" integer DEFAULT 0 NOT NULL,
	"country_rank" integer DEFAULT 0 NOT NULL,
	"state_rank" integer,
	CONSTRAINT "ranks_single_person_id_event_id_pk" PRIMARY KEY("person_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"pos" smallint DEFAULT 0,
	"best" integer DEFAULT 0 NOT NULL,
	"average" integer DEFAULT 0 NOT NULL,
	"competition_id" varchar(32) NOT NULL,
	"round_type_id" varchar(1),
	"event_id" varchar(6) NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"format_id" varchar(1) NOT NULL,
	"regional_single_record" varchar(3),
	"regional_average_record" varchar(3)
);
--> statement-breakpoint
CREATE TABLE "result_attempts" (
	"value" integer DEFAULT 0 NOT NULL,
	"attempt_number" smallint NOT NULL,
	"result_id" varchar(64) NOT NULL,
	CONSTRAINT "result_attempts_result_id_attempt_number_pk" PRIMARY KEY("result_id","attempt_number")
);
--> statement-breakpoint
CREATE TABLE "round_types" (
	"id" varchar(1) PRIMARY KEY NOT NULL,
	"final" boolean DEFAULT false NOT NULL,
	"name" varchar(256) NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"cell_name" varchar(45) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"logo" varchar(191),
	"social_links" jsonb,
	"active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" varchar(3) PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sum_of_ranks" (
	"rank" integer NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"result_type" varchar(7) NOT NULL,
	"overall" integer NOT NULL,
	"events" jsonb NOT NULL,
	CONSTRAINT "sum_of_ranks_person_id_result_type_pk" PRIMARY KEY("person_id","result_type")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"name" varchar(50) NOT NULL,
	"description" text,
	"image" varchar(191),
	"cover_image" varchar(191),
	"state_id" varchar(3) PRIMARY KEY NOT NULL,
	"founded" timestamp,
	"social_links" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_achievements" (
	"state_id" varchar(3) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"person_id" varchar(10) PRIMARY KEY NOT NULL,
	"specialties" jsonb,
	"achievements" jsonb,
	"is_admin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_delegates" ADD CONSTRAINT "competition_delegates_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_delegates" ADD CONSTRAINT "competition_delegates_delegate_id_delegates_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."delegates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_events" ADD CONSTRAINT "competition_events_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_events" ADD CONSTRAINT "competition_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_organizers" ADD CONSTRAINT "competition_organizers_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_organizers" ADD CONSTRAINT "competition_organizers_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegates" ADD CONSTRAINT "delegates_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kinch_ranks" ADD CONSTRAINT "kinch_ranks_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranks_average" ADD CONSTRAINT "ranks_average_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranks_average" ADD CONSTRAINT "ranks_average_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranks_single" ADD CONSTRAINT "ranks_single_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranks_single" ADD CONSTRAINT "ranks_single_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_round_type_id_round_types_id_fk" FOREIGN KEY ("round_type_id") REFERENCES "public"."round_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_attempts" ADD CONSTRAINT "result_attempts_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sum_of_ranks" ADD CONSTRAINT "sum_of_ranks_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_achievements" ADD CONSTRAINT "team_achievements_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "championship_comp_idx" ON "championships" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "competitions_state_idx" ON "competitions" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "competitions_date_idx" ON "competitions" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "comp_event_event_idx" ON "competition_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "person_name_idx" ON "persons" USING btree ("name");--> statement-breakpoint
CREATE INDEX "person_state_idx" ON "persons" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "rank_avg_event_best_idx" ON "ranks_average" USING btree ("event_id","best");--> statement-breakpoint
CREATE INDEX "rank_sin_event_best_idx" ON "ranks_single" USING btree ("event_id","best");--> statement-breakpoint
CREATE INDEX "results_comp_event_idx" ON "results" USING btree ("competition_id","event_id");--> statement-breakpoint
CREATE INDEX "results_person_idx" ON "results" USING btree ("person_id");