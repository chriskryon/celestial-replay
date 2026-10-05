import { NextResponse } from "next/server";
import { z } from "zod";

import { isPlayableMediaUrl } from "@/lib/media-url";
import { type PlaylistVerificationItem, youtubeIdFromSource } from "@/lib/playlist-verification";
import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";

const inputSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(128),
    source: z.string().trim().url().refine(isPlayableMediaUrl),
  })).min(1).max(100),
});

type YoutubeVideo = {
  id?: string;
  status?: { embeddable?: boolean; privacyStatus?: string };
};

type YoutubeResponse = { items?: YoutubeVideo[] };

export async function POST(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "playlist-verification"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Envie de 1 a 100 fontes de vídeo válidas." }, { status: 400 });

  const results: PlaylistVerificationItem[] = input.data.items.map((item) => ({
    ...item,
    status: "unconfirmed",
    message: "Esta fonte será confirmada quando a reprodução começar.",
  }));
  const youtubeItems = input.data.items.flatMap((item) => {
    const videoId = youtubeIdFromSource(item.source);
    return videoId ? [{ ...item, videoId }] : [];
  });
  if (youtubeItems.length === 0) return NextResponse.json({ items: results });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ items: results.map((item) => youtubeIdFromSource(item.source)
      ? { ...item, message: "A verificação do YouTube não está configurada neste ambiente." }
      : item) });
  }

  try {
    const videos = new Map<string, YoutubeVideo>();
    for (let index = 0; index < youtubeItems.length; index += 50) {
      const ids = youtubeItems.slice(index, index + 50).map((item) => item.videoId);
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "status");
      url.searchParams.set("id", ids.join(","));
      url.searchParams.set("key", apiKey);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("youtube-unavailable");
      const payload = await response.json() as YoutubeResponse;
      for (const video of payload.items ?? []) if (video.id) videos.set(video.id, video);
    }

    for (const item of youtubeItems) {
      const resultIndex = results.findIndex((result) => result.id === item.id);
      const video = videos.get(item.videoId);
      if (!video) results[resultIndex] = { ...item, source: item.source, status: "unavailable", message: "O vídeo não está público ou não existe mais." };
      else if (video.status?.privacyStatus !== "public") results[resultIndex] = { ...item, source: item.source, status: "unavailable", message: "Este vídeo não está público." };
      else if (video.status?.embeddable === false) results[resultIndex] = { ...item, source: item.source, status: "unavailable", message: "Este vídeo não permite reprodução incorporada." };
      else results[resultIndex] = { ...item, source: item.source, status: "ready", message: "Disponível para reprodução incorporada." };
    }
  } catch {
    for (const item of youtubeItems) {
      const resultIndex = results.findIndex((result) => result.id === item.id);
      results[resultIndex] = { ...item, source: item.source, status: "unconfirmed", message: "O YouTube não respondeu ao teste agora." };
    }
  }

  return NextResponse.json({ items: results });
}
