import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playlistItems, playlists } from "@/lib/db/schema";
import { playlistInput } from "../route";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

async function currentOwner() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const rateLimitError = await requireWithinRateLimit(request, "playlist-write"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const ownerId = await currentOwner();
  if (!ownerId) return NextResponse.json({ error: "Faça login para editar playlists." }, { status: 401 });

  const input = playlistInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Informe um nome, URLs válidas e repetições maiores que zero." }, { status: 400 });

  const { id } = await context.params;
  const saved = await db.transaction(async (tx) => {
    const [playlist] = await tx.update(playlists)
      .set({ name: input.data.name, updatedAt: new Date() })
      .where(and(eq(playlists.id, id), eq(playlists.ownerId, ownerId)))
      .returning();
    if (!playlist) return null;

    await tx.delete(playlistItems).where(eq(playlistItems.playlistId, playlist.id));
    const items = await tx.insert(playlistItems).values(input.data.items.map((item, position) => ({
      playlistId: playlist.id,
      url: item.url,
      repetitions: item.repetitions,
      position,
    }))).returning();
    return { playlist, items };
  });
  if (!saved) return NextResponse.json({ error: "Playlist não encontrada." }, { status: 404 });

  return NextResponse.json({ playlist: { ...saved.playlist, items: saved.items } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const rateLimitError = await requireWithinRateLimit(_request, "playlist-write"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(_request); if (originError) return originError;
  const ownerId = await currentOwner();
  if (!ownerId) return NextResponse.json({ error: "Faça login para apagar playlists." }, { status: 401 });

  const { id } = await context.params;
  const [playlist] = await db.delete(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.ownerId, ownerId)))
    .returning({ id: playlists.id });
  if (!playlist) return NextResponse.json({ error: "Playlist não encontrada." }, { status: 404 });

  return NextResponse.json({ id: playlist.id });
}
