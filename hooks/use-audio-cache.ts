import { useEffect, useState } from "react";

import { resolveLocalAudioUrl } from "@/lib/audio-cache";
import { isOwnUploadUrl } from "@/lib/media-url";
import type { VideoItem } from "@/lib/replay-playlist";

// Resolve a URL local (Cache API) do item em exibição quando ele é um upload
// próprio, sem nunca escrever essa URL local de volta no estado da fila —
// blob: URLs não sobrevivem a reload e não podem ser persistidas (ver
// useSessionPersistence). Isso fica só de renderização, igual useVideoMetadata.
// isResolving fica true enquanto a cópia local não está pronta, pra quem usa
// não cair pra URL remota nesse meio-tempo — senão o player chegaria a iniciar
// uma requisição pro Blob antes da troca, gastando transferência à toa.
export function useAudioCache(displayedVideo: VideoItem | null) {
  const src = displayedVideo?.src;
  const isUpload = Boolean(src && isOwnUploadUrl(src));
  const [resolved, setResolved] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    if (!src || !isOwnUploadUrl(src)) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    void resolveLocalAudioUrl(src).then((url) => {
      if (cancelled) { URL.revokeObjectURL(url); return; }
      objectUrl = url;
      setResolved({ src, url });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  const resolvedSrc = resolved && resolved.src === src ? resolved.url : null;
  return { isResolving: isUpload && !resolvedSrc, resolvedSrc };
}
