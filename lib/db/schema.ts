import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("playlists_owner_updated_at_idx").on(table.ownerId, table.updatedAt)],
);

export const playlistItems = pgTable(
  "playlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: integer("position").notNull(),
    repetitions: integer("repetitions").notNull(),
  },
  (table) => [
    uniqueIndex("playlist_items_playlist_position_unique").on(table.playlistId, table.position),
    check("playlist_items_repetitions_positive", sql`${table.repetitions} > 0`),
  ],
);

export const playbackHistory = pgTable(
  "playback_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull(),
    url: text("url").notNull(),
    completedRepetitions: integer("completed_repetitions").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("playback_history_owner_completed_at_idx").on(table.ownerId, table.completedAt),
    check("playback_history_repetitions_positive", sql`${table.completedRepetitions} > 0`),
  ],
);
