import type { VideoItem } from "@/lib/replay-playlist";

export type PlaybackCursor = { activeIndex: number; remaining: number };

export function startPlayback(queue: VideoItem[]): PlaybackCursor | null {
  const first = queue[0];
  return first ? { activeIndex: 0, remaining: first.repetitions } : null;
}

export function advancePlayback(queue: VideoItem[], cursor: PlaybackCursor) {
  const active = queue[cursor.activeIndex];
  if (!active) return { kind: "idle" as const };
  if (cursor.remaining > 1) return { kind: "repeat" as const, cursor: { ...cursor, remaining: cursor.remaining - 1 } };
  return moveToNextVideo(queue, cursor.activeIndex);
}

export function moveToNextVideo(queue: VideoItem[], activeIndex: number) {
  const nextIndex = activeIndex + 1;
  const next = queue[nextIndex];
  return next
    ? { kind: "next" as const, cursor: { activeIndex: nextIndex, remaining: next.repetitions } }
    : { kind: "complete" as const };
}

export function moveToPreviousVideo(queue: VideoItem[], activeIndex: number) {
  const previousIndex = activeIndex - 1;
  const previous = queue[previousIndex];
  if (!previous) return null;
  return {
    cursor: { activeIndex: previousIndex, remaining: previous.repetitions },
    queue: queue.map((item, index) => index >= previousIndex ? { ...item, skippedRepetitions: undefined } : item),
  };
}

export function skipFailedPlayback(queue: VideoItem[], cursor: PlaybackCursor) {
  const failed = queue[cursor.activeIndex];
  if (!failed) return { kind: "idle" as const };
  const skippedQueue = queue.map((item) => item.id === failed.id ? { ...item, skippedRepetitions: cursor.remaining } : item);
  const next = moveToNextVideo(skippedQueue, cursor.activeIndex);
  return next.kind === "next"
    ? { kind: "next" as const, cursor: next.cursor, queue: skippedQueue }
    : { kind: "complete" as const, queue: skippedQueue };
}
