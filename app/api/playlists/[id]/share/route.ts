import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playlists } from "@/lib/db/schema";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

async function setPublic(request: Request, context: { params: Promise<{ id: string }> }, isPublic: boolean) {
  const rateLimitError = await requireWithinRateLimit(request, "playlist-write"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.json({ error: "Faça login para compartilhar playlists." }, { status: 401 });

  const { id } = await context.params;
  const [updated] = await db.update(playlists)
    .set({ isPublic, updatedAt: new Date() })
    .where(and(eq(playlists.id, id), eq(playlists.ownerId, user.id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Playlist não encontrada." }, { status: 404 });

  return NextResponse.json({ playlist: updated });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return setPublic(request, context, true);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return setPublic(request, context, false);
}
