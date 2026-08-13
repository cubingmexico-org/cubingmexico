CREATE TABLE "designs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"competition_id" varchar(32),
	"user_id" varchar(64) NOT NULL,
	"module" varchar(32) NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"json" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"owner_scope" varchar(16) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "designs_competition_module_idx" ON "designs" USING btree ("competition_id","module");--> statement-breakpoint
CREATE INDEX "designs_owner_scope_idx" ON "designs" USING btree ("owner_scope","is_public");--> statement-breakpoint
CREATE INDEX "designs_user_idx" ON "designs" USING btree ("user_id");
