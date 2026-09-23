CREATE TABLE "uploaded_audios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlist_items" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uploaded_audios_owner_url_unique" ON "uploaded_audios" USING btree ("owner_id","url");--> statement-breakpoint
CREATE INDEX "uploaded_audios_owner_updated_at_idx" ON "uploaded_audios" USING btree ("owner_id","updated_at");