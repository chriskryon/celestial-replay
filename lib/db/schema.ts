import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const playlists = pgTable("playlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playlistItems = pgTable("playlist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  playlistId: uuid("playlist_id")
    .notNull()
    .references(() => playlists.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull(),
  repetitions: integer("repetitions").notNull(),
});

export const playbackHistory = pgTable("playback_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  url: text("url").notNull(),
  completedRepetitions: integer("completed_repetitions").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
});
