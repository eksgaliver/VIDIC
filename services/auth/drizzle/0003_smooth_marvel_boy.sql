CREATE TABLE "shift_attendance_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"position" varchar(150) NOT NULL,
	"supervisor_id" uuid,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"work_location_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "position" varchar(150);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "supervisor_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_attendance_locations" ADD CONSTRAINT "shift_attendance_locations_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_attendance_locations" ADD CONSTRAINT "shift_attendance_locations_location_id_company_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."company_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_work_location_id_company_locations_id_fk" FOREIGN KEY ("work_location_id") REFERENCES "public"."company_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_shift_attendance_location" ON "shift_attendance_locations" USING btree ("shift_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_shift_attendance_shift_id" ON "shift_attendance_locations" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "idx_shift_attendance_location_id" ON "shift_attendance_locations" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_company_id" ON "shifts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_employee_id" ON "shifts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_supervisor_id" ON "shifts" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_work_location_id" ON "shifts" USING btree ("work_location_id");--> statement-breakpoint
CREATE INDEX "idx_shifts_status" ON "shifts" USING btree ("status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_users_supervisor_id" ON "users" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "idx_auth_users_status" ON "users" USING btree ("status");