import { asc, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playlistItems, playlists } from "@/lib/db/schema";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

export const playlistInput = z.object({
  name: z.string().trim().min(1).max(80),
  items: z.array(z.object({ url: z.url().refine(isPlayableMediaUrl), repetitions: z.number().int().positive() })).min(1).max(100),
});

async function requireUser() {
  const user = await getCurrentUser();
  return user?.id ? user : null;
}

export async function GET(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "playlist-read"); if (rateLimitError) return rateLimitError;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Faça login para consultar playlists." }, { status: 401 });

  const savedPlaylists = await db.select().from(playlists)
    .where(eq(playlists.ownerId, user.id))
    .orderBy(desc(playlists.updatedAt));
  const ids = savedPlaylists.map((playlist) => playlist.id);
  const items = ids.length === 0 ? [] : await db.select().from(playlistItems)
    .where(inArray(playlistItems.playlistId, ids))
    .orderBy(asc(playlistItems.position));

  return NextResponse.json({
    playlists: savedPlaylists.map((playlist) => ({
      ...playlist,
      items: items.filter((item) => item.playlistId === playlist.id),
    })),
  });
}

export async function POST(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "playlist-write"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Faça login para salvar playlists." }, { status: 401 });

  const result = playlistInput.safeParse(await request.json().catch(() => null));
  if (!result.success) return NextResponse.json({ error: "A playlist precisa de nome, links de vídeo válidos e repetições maiores que zero." }, { status: 400 });

  const [playlist] = await db.insert(playlists).values({ ownerId: user.id, name: result.data.name }).returning();
  const items = await db.insert(playlistItems).values(result.data.items.map((item, position) => ({
    playlistId: playlist.id,
    url: item.url,
    repetitions: item.repetitions,
    position,
  }))).returning();

  return NextResponse.json({ playlist: { ...playlist, items } }, { status: 201 });
}
