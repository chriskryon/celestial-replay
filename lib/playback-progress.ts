import type { VideoItem } from "@/lib/replay-playlist";

export type PlaylistSegment = { id: string; label: string; tone: number; weight: number };

export function getTotalRepetitions(queue: VideoItem[]) {
  return queue.reduce((total, item) => total + item.repetitions, 0);
}

export function getCompletedRepetitions(queue: VideoItem[], activeIndex: number | null, remaining: number) {
  if (activeIndex === null) return 0;
  const activeVideo = queue[activeIndex];
  return queue.slice(0, activeIndex).reduce((total, item) => total + item.repetitions, 0)
    + Math.max(0, (activeVideo?.repetitions ?? 0) - remaining);
}

export function getRemainingVideoCount(queue: VideoItem[], activeIndex: number | null) {
  return activeIndex === null ? queue.length : Math.max(0, queue.length - activeIndex - 1);
}

export function estimateDuration(duration: number | null, knownDurations: number[]) {
  if (duration && duration > 0) return duration;
  const valid = knownDurations.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : 1;
}

export function buildPlaylistSegments(queue: VideoItem[], durations: Record<string, number>, activeVideoId: string | undefined, duration: number | null): PlaylistSegment[] {
  const fallback = estimateDuration(duration, Object.values(durations));
  return queue.flatMap((item, videoIndex) => {
    const segmentDuration = durations[item.id] ?? (item.id === activeVideoId && duration && duration > 0 ? duration : fallback);
    return Array.from({ length: item.repetitions }, (_, repetitionIndex) => ({
      id: `${item.id}-${repetitionIndex}`,
      label: `Vídeo ${videoIndex + 1}, repetição ${repetitionIndex + 1}`,
      tone: videoIndex % 4,
      weight: segmentDuration,
    }));
  });
}
