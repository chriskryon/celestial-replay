import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { requireSameOrigin } from "@/lib/request-security";

const historyInput = z.object({
  url: z.url().refine(isPlayableMediaUrl),
  completedRepetitions: z.number().int().positive(),
});

async function requireUser() {
  const user = await getCurrentUser();
  return user?.id ? user : null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Faça login para consultar seu histórico." }, { status: 401 });

  const entries = await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt));

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request); if (originError) return originError;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Faça login para salvar seu histórico." }, { status: 401 });

  const result = historyInput.safeParse(await request.json().catch(() => null));
  if (!result.success) return NextResponse.json({ error: "Dados de reprodução inválidos." }, { status: 400 });

  const [entry] = await db.insert(playbackHistory).values({
    ownerId: user.id,
    url: result.data.url,
    completedRepetitions: result.data.completedRepetitions,
  }).returning();

  return NextResponse.json({ entry }, { status: 201 });
}
