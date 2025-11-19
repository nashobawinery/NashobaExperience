CREATE TYPE "public"."account_status" AS ENUM('active', 'pending_approval', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."b2b_user_type" AS ENUM('customer', 'sales_rep', 'admin');--> statement-breakpoint
CREATE TYPE "public"."beer_bitterness" AS ENUM('mild', 'moderate', 'hoppy', 'very_hoppy');--> statement-breakpoint
CREATE TYPE "public"."beer_color" AS ENUM('pale', 'amber', 'dark');--> statement-breakpoint
CREATE TYPE "public"."beer_style" AS ENUM('ipa', 'lager', 'stout', 'porter', 'ale', 'wheat_beer', 'pilsner', 'sour', 'amber', 'pale_ale', 'saison', 'belgian');--> statement-breakpoint
CREATE TYPE "public"."body" AS ENUM('light', 'medium', 'full');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('wine', 'spirits', 'beer', 'canned_cocktail', 'canned_wine');--> statement-breakpoint
CREATE TYPE "public"."product_media_role" AS ENUM('primary', 'label', 'lifestyle', 'gallery');--> statement-breakpoint
CREATE TYPE "public"."redemption_status" AS ENUM('pending', 'applied', 'void');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('discount', 'token');--> statement-breakpoint
CREATE TYPE "public"."spirit_aging" AS ENUM('unaged', 'young', 'aged', 'extra_aged');--> statement-breakpoint
CREATE TYPE "public"."spirit_flavor" AS ENUM('smooth', 'bold', 'sweet', 'spicy', 'fruity', 'smoky', 'herbal', 'citrus');--> statement-breakpoint
CREATE TYPE "public"."spirit_type" AS ENUM('whiskey', 'vodka', 'gin', 'rum', 'tequila', 'brandy', 'cognac', 'liqueur', 'mezcal', 'bourbon', 'scotch', 'rye');--> statement-breakpoint
CREATE TYPE "public"."sweetness" AS ENUM('dry', 'off-dry', 'semi-sweet', 'sweet');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('viewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."wine_color" AS ENUM('red', 'white', 'rosé', 'sparkling', 'dessert');--> statement-breakpoint
CREATE TABLE "achievement_redemptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" varchar NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"status" "redemption_status" DEFAULT 'pending' NOT NULL,
	"applied_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "b2b_admins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "b2b_customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_name" varchar NOT NULL,
	"account_status" "account_status" DEFAULT 'pending_approval' NOT NULL,
	"pricing_tier_id" varchar,
	"license_number" varchar,
	"tax_id" varchar,
	"credit_terms" varchar,
	"credit_limit" numeric(10, 2),
	"primary_contact_name" varchar NOT NULL,
	"primary_contact_role" varchar,
	"email_address" varchar NOT NULL,
	"password_hash" varchar,
	"phone_number" varchar NOT NULL,
	"alt_phone_number" varchar,
	"billing_address" text,
	"billing_city" varchar,
	"billing_state" varchar,
	"billing_zip_code" varchar,
	"shipping_address" text,
	"shipping_city" varchar,
	"shipping_state" varchar,
	"shipping_zip_code" varchar,
	"sales_rep_id" varchar,
	"approved_at" timestamp,
	"approved_by_admin_id" varchar,
	"signup_date" timestamp DEFAULT now() NOT NULL,
	"last_order_date" timestamp,
	"total_purchase_value" numeric(10, 2) DEFAULT '0',
	"commitment_start_date" timestamp,
	"notes" text,
	"accepts_marketing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_customers_email_address_unique" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE "b2b_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"product_name" text NOT NULL,
	"sku" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"retail_price" numeric(10, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"order_number" varchar NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) NOT NULL,
	"notes" text,
	"shipping_address" text,
	"shipping_city" varchar,
	"shipping_state" varchar,
	"shipping_zip_code" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "b2b_password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"user_type" "b2b_user_type" NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "b2b_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar NOT NULL,
	"setting_value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "b2b_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "b2b_slideshow_slides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"highlight" text,
	"media_type" text NOT NULL,
	"media_url" text,
	"media_library_id" varchar,
	"video_id" varchar,
	"icon_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_discounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"source" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"label" text NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characteristics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"product_types" "category"[] NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "characteristics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "commercials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_options" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_type" text NOT NULL,
	"option_value" text NOT NULL,
	"display_label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "filter_options_field_type_option_value_unique" UNIQUE("field_type","option_value")
);
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_name" text NOT NULL,
	"preferred_beverage_types" text[],
	"wine_colors" text[],
	"flavor_preferences" text[],
	"occasion" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_library" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"object_path" text NOT NULL,
	"public_url" text NOT NULL,
	"category" text DEFAULT 'uncategorized' NOT NULL,
	"description" text,
	"alt_text" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_characteristics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"characteristic_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_characteristics_product_id_characteristic_id_unique" UNIQUE("product_id","characteristic_id")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"media_id" varchar NOT NULL,
	"role" "product_media_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_unique" UNIQUE("product_id","role","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_notes_session_id_product_id_unique" UNIQUE("session_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"type" text,
	"varietal" text,
	"vintage_year" text,
	"region" text,
	"description" text NOT NULL,
	"tasting_notes" text,
	"food_pairings" text,
	"serving_temp" text,
	"alcohol_content" text,
	"bottle_size" text,
	"price" numeric(10, 2) NOT NULL,
	"cost" numeric(10, 2),
	"wholesale_pricing" numeric(10, 2),
	"sku" text,
	"stock_quantity" integer DEFAULT 0,
	"low_stock_threshold" integer DEFAULT 10,
	"ignore_inventory" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"label_image_url" text,
	"lifestyle_image_url" text,
	"characteristics" text,
	"wine_color" "wine_color",
	"sweetness" text,
	"body" text,
	"beer_style" "beer_style",
	"beer_color" "beer_color",
	"beer_bitterness" "beer_bitterness",
	"spirit_type" "spirit_type",
	"spirit_aging" "spirit_aging",
	"spirit_flavor" "spirit_flavor",
	"production_method" text,
	"aging_process" text,
	"awards" text,
	"rating" numeric(3, 1),
	"available" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"new_arrival" boolean DEFAULT false NOT NULL,
	"staff_pick" boolean DEFAULT false NOT NULL,
	"wine_of_month" boolean DEFAULT false NOT NULL,
	"tags" text[],
	"case_size" integer DEFAULT 12 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "sales_reps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"phone_number" varchar,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_reps_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slideshow_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text,
	"image_url" text,
	"title" text,
	"content_html" text,
	"caption" text,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"ease_of_use" integer,
	"helpfulness" integer,
	"staff_replacement" integer,
	"recommendation" integer,
	"favorite_feature" text,
	"improvements" text,
	"additional_comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_name" text NOT NULL,
	"description" text,
	"discount_percentage" numeric(5, 2) NOT NULL,
	"commitment_cases" integer DEFAULT 0,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_pricing_tier_name_unique" UNIQUE("tier_name")
);
--> statement-breakpoint
CREATE TABLE "trivia_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"score_threshold" integer NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"reward_value" numeric(10, 2) NOT NULL,
	"achievement_message" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trivia_achievements_score_threshold_unique" UNIQUE("score_threshold")
);
--> statement-breakpoint
CREATE TABLE "trivia_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_questions" integer NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"achievement_id" varchar,
	"discount_applied_at" timestamp,
	"token_verified_at" timestamp,
	"staff_verifier" text,
	"notes" text,
	"locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trivia_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answers" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trivia_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"attempt_id" varchar,
	"question_id" varchar NOT NULL,
	"is_correct" boolean NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"duration" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "view_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"view_count" integer DEFAULT 1 NOT NULL,
	"last_viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whitelisted_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whitelisted_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "achievement_redemptions" ADD CONSTRAINT "achievement_redemptions_attempt_id_trivia_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."trivia_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_customers" ADD CONSTRAINT "b2b_customers_pricing_tier_id_tier_pricing_id_fk" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."tier_pricing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_customers" ADD CONSTRAINT "b2b_customers_sales_rep_id_sales_reps_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_customers" ADD CONSTRAINT "b2b_customers_approved_by_admin_id_b2b_admins_id_fk" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."b2b_admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_order_items" ADD CONSTRAINT "b2b_order_items_order_id_b2b_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."b2b_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_order_items" ADD CONSTRAINT "b2b_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_customer_id_b2b_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."b2b_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_slideshow_slides" ADD CONSTRAINT "b2b_slideshow_slides_media_library_id_media_library_id_fk" FOREIGN KEY ("media_library_id") REFERENCES "public"."media_library"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_slideshow_slides" ADD CONSTRAINT "b2b_slideshow_slides_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_discounts" ADD CONSTRAINT "cart_discounts_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_characteristics" ADD CONSTRAINT "product_characteristics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_characteristics" ADD CONSTRAINT "product_characteristics_characteristic_id_characteristics_id_fk" FOREIGN KEY ("characteristic_id") REFERENCES "public"."characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_media_library_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_notes" ADD CONSTRAINT "product_notes_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_notes" ADD CONSTRAINT "product_notes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_attempts" ADD CONSTRAINT "trivia_attempts_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_attempts" ADD CONSTRAINT "trivia_attempts_achievement_id_trivia_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."trivia_achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_scores" ADD CONSTRAINT "trivia_scores_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_scores" ADD CONSTRAINT "trivia_scores_attempt_id_trivia_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."trivia_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trivia_scores" ADD CONSTRAINT "trivia_scores_question_id_trivia_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."trivia_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_history" ADD CONSTRAINT "view_history_session_id_guest_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "view_history" ADD CONSTRAINT "view_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_b2b_session_expire" ON "b2b_sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_characteristics_product_types" ON "characteristics" USING gin ("product_types");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");