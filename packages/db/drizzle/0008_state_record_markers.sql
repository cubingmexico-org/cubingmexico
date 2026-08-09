ALTER TABLE "results" ADD COLUMN "state_single_record" varchar(3);--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "state_average_record" varchar(3);--> statement-breakpoint
CREATE INDEX "results_state_single_record_idx" ON "results" USING btree ("state_single_record");--> statement-breakpoint
CREATE INDEX "results_state_average_record_idx" ON "results" USING btree ("state_average_record");
