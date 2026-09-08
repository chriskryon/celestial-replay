import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackSessions } from "@/lib/db/schema";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

const sessionInput = z.object({
  queue: z.array(z.object({ id: z.string().min(1).max(100), src: z.url().refine(isPlayableMediaUrl), repetitions: z.number().int().positive() })).min(1).max(100),
  activeIndex: z.number().int().nonnegative(),
  remaining: z.number().int().positive(),
  playlistName: z.string().trim().min(1).max(80),
  volume: z.number().int().min(0).max(100),
  playbackRate: z.number().min(0.25).max(4).default(1),
}).refine((value) => value.activeIndex < value.queue.length && value.remaining <= value.queue[value.activeIndex].repetitions);

async function requireUser() {
  const user = await getCurrentUser();
  return user?.id ? user : null;
}

export async function GET(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "history-read"); if (rateLimitError) return rateLimitError;
  const user = await requireUser();
  if (!user) return NextResponse.json({ session: null });
  const [session] = await db.select().from(playbackSessions).where(eq(playbackSessions.ownerId, user.id));
  return NextResponse.json({ session: session ?? null });
}

export async function PUT(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "history-write"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Faça login para retomar sessões." }, { status: 401 });
  const input = sessionInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Sessão de reprodução inválida." }, { status: 400 });

  const [session] = await db.insert(playbackSessions).values({ ownerId: user.id, ...input.data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: playbackSessions.ownerId, set: { ...input.data, updatedAt: new Date() } })
    .returning();
  return NextResponse.json({ session });
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Faça login para apagar sessões." }, { status: 401 });
  await db.delete(playbackSessions).where(eq(playbackSessions.ownerId, user.id));
  return new NextResponse(null, { status: 204 });
}
