import type { Metadata } from "next";
import { asc, desc, eq, inArray } from "drizzle-orm";

import { PlaylistAccessPanel } from "@/components/playlist-access-panel";
import { PlaylistManager } from "@/components/playlist-manager";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playlistItems, playlists } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Suas playlists",
  description: "Salve, reproduza e organize playlists com repetições por vídeo.",
  alternates: { canonical: "/playlists" },
};

export default async function PlaylistsPage() {
  const user = await getCurrentUser();
  if (!user) return <PlaylistAccessPanel />;

  const savedPlaylists = await db.select().from(playlists)
    .where(eq(playlists.ownerId, user.id))
    .orderBy(desc(playlists.updatedAt));
  const playlistIds = savedPlaylists.map((playlist) => playlist.id);
  const items = playlistIds.length === 0 ? [] : await db.select().from(playlistItems)
    .where(inArray(playlistItems.playlistId, playlistIds))
    .orderBy(asc(playlistItems.position));

  const initialPlaylists = savedPlaylists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    updatedAt: playlist.updatedAt.toISOString(),
    items: items.filter((item) => item.playlistId === playlist.id).map((item) => ({
      id: item.id,
      url: item.url,
      repetitions: item.repetitions,
      position: item.position,
    })),
  }));

  return <PlaylistManager initialPlaylists={initialPlaylists} />;
}
