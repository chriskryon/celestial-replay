CREATE TABLE "playback_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"queue" jsonb NOT NULL,
	"active_index" integer NOT NULL,
	"remaining" integer NOT NULL,
	"playlist_name" text NOT NULL,
	"volume" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playback_sessions_remaining_positive" CHECK ("playback_sessions"."remaining" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "playback_sessions_owner_unique" ON "playback_sessions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "playback_sessions_owner_updated_at_idx" ON "playback_sessions" USING btree ("owner_id","updated_at");