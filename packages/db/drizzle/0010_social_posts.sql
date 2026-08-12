CREATE TABLE "social_posts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"competition_id" varchar(32) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"external_id" varchar(64),
	"posted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_comp_platform_idx" ON "social_posts" USING btree ("competition_id","platform");--> statement-breakpoint
CREATE INDEX "social_posts_competition_idx" ON "social_posts" USING btree ("competition_id");
