CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand_name" varchar(150),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"industry" varchar(100),
	"website" varchar(255),
	"logo_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "company_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"province" varchar(100),
	"postal_code" varchar(10),
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"radius_meters" integer DEFAULT 100 NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Jakarta' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "company_locations" ADD CONSTRAINT "company_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_companies_code" ON "companies" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_companies_status" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_company_locations_company_id" ON "company_locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_locations_is_primary" ON "company_locations" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "idx_auth_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_auth_users_company_id" ON "users" USING btree ("company_id");