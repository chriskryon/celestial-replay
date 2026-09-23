import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playlists } from "@/lib/db/schema";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

const favoriteInput = z.object({ isFavorite: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const rateLimitError = await requireWithinRateLimit(request, "playlist-write"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Faça login para favoritar playlists." }, { status: 401 });

  const input = favoriteInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Favorito inválido." }, { status: 400 });

  const { id } = await context.params;
  const [playlist] = await db.update(playlists)
    .set({ isFavorite: input.data.isFavorite, updatedAt: new Date() })
    .where(and(eq(playlists.id, id), eq(playlists.ownerId, user.id)))
    .returning({ id: playlists.id, isFavorite: playlists.isFavorite, updatedAt: playlists.updatedAt });
  if (!playlist) return NextResponse.json({ error: "Playlist não encontrada." }, { status: 404 });
  return NextResponse.json({ playlist });
}
