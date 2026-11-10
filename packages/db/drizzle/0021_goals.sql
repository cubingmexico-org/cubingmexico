CREATE TABLE "goals" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"year" integer NOT NULL,
	"type" varchar(16) NOT NULL,
	"target" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_person_year_idx" ON "goals" USING btree ("person_id","year");