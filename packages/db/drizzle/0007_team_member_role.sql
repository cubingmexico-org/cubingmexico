ALTER TABLE "team_members" ADD COLUMN "role" varchar(20);--> statement-breakpoint
UPDATE "team_members" SET "role" = 'admin' WHERE "is_admin" = true;--> statement-breakpoint
ALTER TABLE "team_members" DROP COLUMN "is_admin";
