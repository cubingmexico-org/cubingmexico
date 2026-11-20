CREATE TABLE "certificate_shares" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"competition_id" varchar(32) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"module" varchar(32) NOT NULL,
	"json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_shares_token_uidx" ON "certificate_shares" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_shares_competition_module_uidx" ON "certificate_shares" USING btree ("competition_id","module");
