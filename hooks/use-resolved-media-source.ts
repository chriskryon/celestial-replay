import type { VideoItem } from "@/lib/replay-playlist";
import { useAudioCache } from "@/hooks/use-audio-cache";
import { useOdyseeSource } from "@/hooks/use-odysee-source";

export function useResolvedMediaSource(video: VideoItem | null) {
  const audio = useAudioCache(video);
  const odysee = useOdyseeSource(video);

  return {
    isResolving: audio.isResolving || odysee.isResolving,
    resolvedSrc: audio.resolvedSrc ?? odysee.resolvedSrc,
  };
}
