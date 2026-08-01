CREATE TABLE "streak_ranks" (
	"rank" integer NOT NULL,
	"person_id" varchar(10) NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "streak_ranks_person_id_pk" PRIMARY KEY("person_id")
);
--> statement-breakpoint
ALTER TABLE "streak_ranks" ADD CONSTRAINT "streak_ranks_person_id_persons_wca_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("wca_id") ON DELETE cascade ON UPDATE no action;