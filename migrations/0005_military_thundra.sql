CREATE TABLE "doh_saved_comparisons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"audit_id_1" varchar NOT NULL,
	"audit_id_2" varchar NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "doh_saved_comparisons" ADD CONSTRAINT "doh_saved_comparisons_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doh_saved_comparisons" ADD CONSTRAINT "doh_saved_comparisons_audit_id_1_doh_audit_assessments_id_fk" FOREIGN KEY ("audit_id_1") REFERENCES "public"."doh_audit_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doh_saved_comparisons" ADD CONSTRAINT "doh_saved_comparisons_audit_id_2_doh_audit_assessments_id_fk" FOREIGN KEY ("audit_id_2") REFERENCES "public"."doh_audit_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doh_saved_comparisons" ADD CONSTRAINT "doh_saved_comparisons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_doh_saved_comparisons_office" ON "doh_saved_comparisons" USING btree ("office_id");
