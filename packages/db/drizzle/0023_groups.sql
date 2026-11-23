DROP TABLE IF EXISTS "sponsors";--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"kind" varchar(16) NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"image" varchar(191),
	"cover_image" varchar(191),
	"founded" timestamp,
	"social_links" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"region_label" varchar(120),
	"website_url" varchar(200),
	"sponsorship_status" varchar(16) DEFAULT 'inactive' NOT NULL,
	"sponsorship_expires_at" timestamp,
	"publicity_enabled" boolean DEFAULT false NOT NULL,
	"publicity_blurb" varchar(240)
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"group_id" varchar(32) NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"specialties" jsonb,
	"achievements" jsonb,
	"role" varchar(20),
	"hide_from_roster" boolean DEFAULT false NOT NULL,
	CONSTRAINT "group_memberships_group_id_person_id_pk" PRIMARY KEY("group_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "group_ranks_single" (
	"group_id" varchar(32) NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"event_id" varchar(6) NOT NULL,
	"best" integer DEFAULT 0 NOT NULL,
	"group_rank" integer NOT NULL,
	CONSTRAINT "group_ranks_single_group_id_person_id_event_id_pk" PRIMARY KEY("group_id","person_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "group_ranks_average" (
	"group_id" varchar(32) NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"event_id" varchar(6) NOT NULL,
	"best" integer DEFAULT 0 NOT NULL,
	"group_rank" integer NOT NULL,
	CONSTRAINT "group_ranks_average_group_id_person_id_event_id_pk" PRIMARY KEY("group_id","person_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "group_record_markers" (
	"group_id" varchar(32) NOT NULL,
	"result_id" varchar(64) NOT NULL,
	"record_type" varchar(8) NOT NULL,
	CONSTRAINT "group_record_markers_group_id_result_id_record_type_pk" PRIMARY KEY("group_id","result_id","record_type")
);
--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ranks_single" ADD CONSTRAINT "group_ranks_single_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ranks_single" ADD CONSTRAINT "group_ranks_single_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ranks_single" ADD CONSTRAINT "group_ranks_single_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ranks_average" ADD CONSTRAINT "group_ranks_average_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ranks_average" ADD CONSTRAINT "group_ranks_average_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_ranks_average" ADD CONSTRAINT "group_ranks_average_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_record_markers" ADD CONSTRAINT "group_record_markers_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_record_markers" ADD CONSTRAINT "group_record_markers_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_kind_idx" ON "groups" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "groups_sponsorship_status_idx" ON "groups" USING btree ("sponsorship_status");--> statement-breakpoint
CREATE INDEX "group_memberships_person_idx" ON "group_memberships" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "group_ranks_single_event_idx" ON "group_ranks_single" USING btree ("group_id","event_id","group_rank");--> statement-breakpoint
CREATE INDEX "group_ranks_average_event_idx" ON "group_ranks_average" USING btree ("group_id","event_id","group_rank");--> statement-breakpoint
CREATE INDEX "group_record_markers_result_idx" ON "group_record_markers" USING btree ("result_id");--> statement-breakpoint
INSERT INTO "groups" ("id", "kind", "name", "description", "region_label", "is_active", "sponsorship_status", "publicity_enabled")
VALUES
	('vallarta', 'community', 'Vallarta Speed', 'Comunidad de speedcubing de la zona metropolitana de Puerto Vallarta.', 'Zona metropolitana de Puerto Vallarta (Jalisco y Bahía de Banderas, Nayarit)', true, 'inactive', false),
	('cubos-dany', 'sponsor', 'Cubos Dany', 'Equipo patrocinado por Cubos Dany.', NULL, true, 'inactive', false)
ON CONFLICT ("id") DO NOTHING;
