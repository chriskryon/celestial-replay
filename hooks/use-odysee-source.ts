"use client";

import { useEffect, useState } from "react";

import type { VideoItem } from "@/lib/replay-playlist";
import { isOdyseeSource } from "@/lib/odysee";

export function useOdyseeSource(video: VideoItem | null) {
  const source = video?.src ?? null;
  const videoId = video?.id ?? null;
  const [resolution, setResolution] = useState<{ source: string; videoId: string; streamUrl: string | null; failed: boolean } | null>(null);
  const currentResolution = resolution?.source === source && resolution.videoId === videoId ? resolution : null;
  const isOdysee = Boolean(source && isOdyseeSource(source));
  const resolvedSrc = currentResolution?.streamUrl ?? null;
  const isResolving = isOdysee && !resolvedSrc && !currentResolution?.failed;

  useEffect(() => {
    if (!source || !videoId || !isOdyseeSource(source)) return;
    let cancelled = false;
    const controller = new AbortController();
    setResolution({ source, videoId, streamUrl: null, failed: false });
    fetch("/api/odysee-stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source }), signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ streamUrl?: string }> : null)
      .then((payload) => { if (!cancelled) setResolution({ source, videoId, streamUrl: payload?.streamUrl ?? null, failed: !payload?.streamUrl }); })
      .catch((error: unknown) => { if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) setResolution({ source, videoId, streamUrl: null, failed: true }); });
    return () => { cancelled = true; controller.abort(); };
  }, [source, videoId]);

  return { isResolving, resolvedSrc };
}
