import type { VideoItem } from "@/lib/replay-playlist";
import { getCompletedRepetitions, getTotalRepetitions } from "@/lib/playback-progress";

type PlaybackSnapshot = {
  activeVideo: VideoItem | null;
  totalRepetitions: number;
  completedRepetitions: number;
  hasNextVideo: boolean;
  hasPrevVideo: boolean;
  completedQueue: VideoItem[];
  visibleQueue: VideoItem[];
};

export function getPlaybackSnapshot(queue: VideoItem[], activeIndex: number | null, remaining: number): PlaybackSnapshot {
  const activeVideo = activeIndex === null ? null : queue[activeIndex] ?? null;
  const totalRepetitions = getTotalRepetitions(queue);
  const completedRepetitions = getCompletedRepetitions(queue, activeIndex, remaining);

  return {
    activeVideo,
    totalRepetitions,
    completedRepetitions,
    hasNextVideo: activeIndex !== null && activeIndex + 1 < queue.length,
    hasPrevVideo: activeIndex !== null && activeIndex > 0,
    completedQueue: activeIndex === null ? [] : queue.slice(0, activeIndex),
    visibleQueue: activeIndex === null ? queue : queue.slice(activeIndex),
  };
}

type PlayerStatusInput = {
  previewVideo: VideoItem | null;
  activeVideo: VideoItem | null;
  isPlaying: boolean;
  hasPlaybackStarted: boolean;
  playBlocked: boolean;
  error: string | null;
  fallbackStatus: string;
  remaining: number;
};

export function getPlayerStatus({ previewVideo, activeVideo, isPlaying, hasPlaybackStarted, playBlocked, error, fallbackStatus, remaining }: PlayerStatusInput) {
  if (previewVideo && !error) return "Vídeo carregado. Clique em Iniciar para começar.";
  if (activeVideo && isPlaying && !hasPlaybackStarted && !error) {
    return playBlocked ? "O navegador bloqueou o início automático. Clique em Continuar." : "Iniciando reprodução…";
  }
  if (activeVideo && isPlaying && !error) return `Reproduzindo ${activeVideo.repetitions - remaining + 1} de ${activeVideo.repetitions}.`;
  if (activeVideo && !error) return "Reprodução pausada.";
  return fallbackStatus;
}
