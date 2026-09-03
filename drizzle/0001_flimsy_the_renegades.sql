CREATE INDEX "playback_history_owner_completed_at_idx" ON "playback_history" USING btree ("owner_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "playlist_items_playlist_position_unique" ON "playlist_items" USING btree ("playlist_id","position");--> statement-breakpoint
CREATE INDEX "playlists_owner_updated_at_idx" ON "playlists" USING btree ("owner_id","updated_at");--> statement-breakpoint
ALTER TABLE "playback_history" ADD CONSTRAINT "playback_history_repetitions_positive" CHECK ("playback_history"."completed_repetitions" > 0);--> statement-breakpoint
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_repetitions_positive" CHECK ("playlist_items"."repetitions" > 0);