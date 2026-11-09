CREATE TABLE IF NOT EXISTS "company_operational_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"province" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_locations" ADD COLUMN IF NOT EXISTS "coordinates_type" varchar(20) DEFAULT 'point' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_locations" ADD COLUMN IF NOT EXISTS "polygon_coordinates" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "company_operational_areas" ADD CONSTRAINT "company_operational_areas_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comp_op_areas_company_id" ON "company_operational_areas" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comp_op_areas_province" ON "company_operational_areas" USING btree ("province");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comp_op_areas_city" ON "company_operational_areas" USING btree ("city");
