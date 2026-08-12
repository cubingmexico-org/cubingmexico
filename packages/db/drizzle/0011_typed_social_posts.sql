ALTER TABLE "social_posts" ADD COLUMN "post_type" varchar(20);--> statement-breakpoint
ALTER TABLE "social_posts" ADD COLUMN "subject_key" varchar(128);--> statement-breakpoint
UPDATE "social_posts" SET "post_type" = 'resultados', "subject_key" = "competition_id" WHERE "post_type" IS NULL;--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "post_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "subject_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "social_posts" ALTER COLUMN "competition_id" DROP NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "social_posts_comp_platform_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_type_subject_platform_idx" ON "social_posts" USING btree ("post_type","subject_key","platform");--> statement-breakpoint
CREATE INDEX "social_posts_post_type_idx" ON "social_posts" USING btree ("post_type");
