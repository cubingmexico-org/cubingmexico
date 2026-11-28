ALTER TABLE "groups" ADD COLUMN "address" varchar(200);--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "city" varchar(80);--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "state_id" varchar(3);--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_state_idx" ON "groups" USING btree ("state_id");
