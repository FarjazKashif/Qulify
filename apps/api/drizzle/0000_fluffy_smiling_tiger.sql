CREATE TYPE "public"."chat_message_role" AS ENUM('visitor', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."conversation_channel" AS ENUM('web', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."lead_intent" AS ENUM('buy', 'sell', 'rent');--> statement-breakpoint
CREATE TYPE "public"."lead_score" AS ENUM('hot', 'warm', 'cold');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('single-family', 'condo', 'townhome', 'multi-family', 'land', 'commercial', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."timeline" AS ENUM('this-week', 'this-month', 'three-months', 'six-months-plus', 'just-browsing', 'unknown');--> statement-breakpoint
CREATE TABLE "agent_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"service_areas" jsonb NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer NOT NULL,
	"agent_name" varchar(255) NOT NULL,
	"agent_whatsapp" varchar(20) NOT NULL,
	"agent_email" varchar(255) NOT NULL,
	"widget_config" jsonb NOT NULL,
	"api_key_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"role" "chat_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"business_id" varchar(255) NOT NULL,
	"channel" "conversation_channel" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lead_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"current_step" varchar(20) NOT NULL,
	"lead_profile" jsonb NOT NULL,
	"missing_fields" jsonb NOT NULL,
	"is_service_match" boolean DEFAULT false NOT NULL,
	"is_price_match" boolean DEFAULT false NOT NULL,
	CONSTRAINT "lead_qualifications_lead_id_unique" UNIQUE("lead_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"phone" varchar(20),
	"email" varchar(255),
	"intent" "lead_intent",
	"budget_range" varchar(50),
	"location_preference" varchar(255),
	"timeline" timeline,
	"score" "lead_score",
	"score_reason" text,
	"status" "lead_status" DEFAULT 'new',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"price" integer NOT NULL,
	"bedrooms" integer,
	"bathrooms" real,
	"sqft" integer,
	"property_type" "property_type" NOT NULL,
	"status" varchar(50) NOT NULL,
	"description" text,
	"photo_urls" jsonb,
	"mls_id" varchar(100),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_qualifications" ADD CONSTRAINT "lead_qualifications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_qualifications" ADD CONSTRAINT "lead_qualifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;