"use client";

import { useEffect, useState } from "react";

import type { VideoItem } from "@/lib/replay-playlist";
import { isOdyseeSource } from "@/lib/odysee";

export function useOdyseeSource(video: VideoItem | null) {
  const source = video?.src ?? null;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!source || !isOdyseeSource(source)) { setResolvedSrc(null); setIsResolving(false); return; }
    let cancelled = false;
    setResolvedSrc(null);
    setIsResolving(true);
    fetch("/api/odysee-stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source }) })
      .then(async (response) => response.ok ? response.json() as Promise<{ streamUrl?: string }> : null)
      .then((payload) => { if (!cancelled) setResolvedSrc(payload?.streamUrl ?? null); })
      .catch(() => { if (!cancelled) setResolvedSrc(null); })
      .finally(() => { if (!cancelled) setIsResolving(false); });
    return () => { cancelled = true; };
  }, [source, video?.id]);

  return { isResolving, resolvedSrc };
}
