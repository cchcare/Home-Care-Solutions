ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "manager_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hire_date" timestamp;--> statement-breakpoint
ALTER TABLE "caregivers" ADD COLUMN IF NOT EXISTS "manager_id" varchar;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_manager_id_users_id_fk') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk"
      FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caregivers_manager_id_users_id_fk') THEN
    ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_manager_id_users_id_fk"
      FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_manager" ON "users" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_caregivers_manager" ON "caregivers" USING btree ("manager_id");
