import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWithinRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-security";
import { YOUTUBE_PLAYLIST_MAX_ITEMS, youtubePlaylistIdFromUrl, youtubePlaylistVideoFromItem } from "@/lib/youtube-playlist";

const importInput = z.object({
  url: z.string().trim().url().refine((value) => youtubePlaylistIdFromUrl(value) !== null),
});

type YoutubePlaylistResponse = {
  items?: Array<{ snippet?: { resourceId?: { kind?: string; videoId?: string }; title?: string } }>;
  nextPageToken?: string;
};

export async function POST(request: Request) {
  const rateLimitError = await requireWithinRateLimit(request, "youtube-playlist-import"); if (rateLimitError) return rateLimitError;
  const originError = requireSameOrigin(request); if (originError) return originError;
  const input = importInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Cole uma URL válida de playlist do YouTube." }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "A importação do YouTube ainda não está configurada." }, { status: 503 });

  const playlistId = youtubePlaylistIdFromUrl(input.data.url)!;
  const videos: Array<{ id: string; title?: string }> = [];
  let pageToken: string | undefined;
  let hasMore = false;

  try {
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("maxResults", String(Math.min(50, YOUTUBE_PLAYLIST_MAX_ITEMS - videos.length)));
      url.searchParams.set("playlistId", playlistId);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url, { cache: "no-store", headers: { "x-goog-api-key": apiKey } });
      if (!response.ok) return NextResponse.json({ error: "Não foi possível importar essa playlist. Verifique se ela é pública." }, { status: 422 });
      const payload = await response.json() as YoutubePlaylistResponse;
      videos.push(...(payload.items ?? [])
        .map(youtubePlaylistVideoFromItem)
        .filter((video): video is { id: string; title?: string } => video !== null));
      pageToken = payload.nextPageToken;
      hasMore = Boolean(pageToken) && videos.length >= YOUTUBE_PLAYLIST_MAX_ITEMS;
    } while (pageToken && videos.length < YOUTUBE_PLAYLIST_MAX_ITEMS);
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o YouTube agora. Tente novamente." }, { status: 502 });
  }

  const uniqueVideos = Array.from(new Map(videos.map((video) => [video.id, video])).values())
    .slice(0, YOUTUBE_PLAYLIST_MAX_ITEMS);
  const items = uniqueVideos
    .map((video) => ({ url: `https://www.youtube.com/watch?v=${video.id}`, title: video.title, repetitions: 1 }));
  if (items.length === 0) return NextResponse.json({ error: "Essa playlist não tem vídeos públicos disponíveis para importar." }, { status: 422 });

  return NextResponse.json({ hasMore, items });
}
