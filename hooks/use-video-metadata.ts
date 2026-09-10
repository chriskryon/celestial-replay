import { useEffect, useState } from "react";

type VideoMetadata = { authorName: string | null; title: string | null };
export type QueueMetadata = VideoMetadata & { loading: boolean };

const isYoutube = (src: string) => /youtube(?:-nocookie)?\.com|youtu\.be/.test(src);

async function loadMetadata(src: string, signal: AbortSignal): Promise<VideoMetadata> {
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(src)}&format=json`, { signal });
  if (!response.ok) return { authorName: null, title: null };
  const result = await response.json() as { author_name?: string; title?: string };
  return { authorName: result.author_name ?? null, title: result.title ?? null };
}

export function useVideoMetadata(activeSource: string | undefined, previewSource: string | undefined) {
  const [metadata, setMetadata] = useState<VideoMetadata>({ authorName: null, title: null });
  useEffect(() => {
    const src = activeSource ?? previewSource;
    if (!src || !isYoutube(src)) { setMetadata({ authorName: null, title: null }); return; }
    const controller = new AbortController();
    void loadMetadata(src, controller.signal).then(setMetadata).catch(() => undefined);
    return () => controller.abort();
  }, [activeSource, previewSource]);
  return metadata;
}

export function useQueueMetadata(sources: string[]) {
  const [metadata, setMetadata] = useState<Record<string, QueueMetadata>>({});
  useEffect(() => {
    const youtubeSources = Array.from(new Set(sources.filter(isYoutube)));
    if (youtubeSources.length === 0) { setMetadata({}); return; }
    const controller = new AbortController();
    setMetadata((current) => Object.fromEntries(youtubeSources.map((src) => [src, { ...current[src], loading: true, authorName: current[src]?.authorName ?? null, title: current[src]?.title ?? null }])));
    void Promise.all(youtubeSources.map(async (src) => [src, { ...(await loadMetadata(src, controller.signal)), loading: false }] as const))
      .then((entries) => setMetadata(Object.fromEntries(entries))).catch(() => undefined);
    return () => controller.abort();
  }, [sources]);
  return metadata;
}
