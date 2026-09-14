import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { SharedPlaylistView } from "@/components/shared-playlist-view";
import { db } from "@/lib/db";
import { playlistItems, playlists } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [playlist] = await db.select().from(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.isPublic, true)))
    .limit(1);
  if (!playlist) notFound();

  const items = await db.select().from(playlistItems)
    .where(eq(playlistItems.playlistId, playlist.id))
    .orderBy(asc(playlistItems.position));

  return <SharedPlaylistView items={items.map((item) => ({ url: item.url, repetitions: item.repetitions }))} name={playlist.name} />;
}
