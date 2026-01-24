CREATE TYPE "public"."notification_type" AS ENUM('daily_summary', 'problem_report');--> statement-breakpoint
CREATE TYPE "public"."quarterly_count_record_status" AS ENUM('pending', 'counted', 'verified');--> statement-breakpoint
CREATE TYPE "public"."quarterly_count_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "admin_notification_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_read_unique" UNIQUE("notification_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"data" text NOT NULL,
	"date" timestamp NOT NULL,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quarterly_count_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"part_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"expected_qty" integer DEFAULT 0 NOT NULL,
	"counted_qty" integer,
	"variance" integer,
	"status" "quarterly_count_record_status" DEFAULT 'pending' NOT NULL,
	"counted_by" uuid,
	"counted_at" timestamp,
	"notes" text,
	CONSTRAINT "quarterly_count_record_unique" UNIQUE("count_id","part_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "quarterly_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "quarterly_count_status" DEFAULT 'in_progress' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_notification_id_admin_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."admin_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_count_records" ADD CONSTRAINT "quarterly_count_records_count_id_quarterly_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."quarterly_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_count_records" ADD CONSTRAINT "quarterly_count_records_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_count_records" ADD CONSTRAINT "quarterly_count_records_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_count_records" ADD CONSTRAINT "quarterly_count_records_counted_by_users_id_fk" FOREIGN KEY ("counted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_counts" ADD CONSTRAINT "quarterly_counts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;