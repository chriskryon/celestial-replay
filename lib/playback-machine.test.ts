import { describe, expect, it } from "vitest";

import { advancePlayback, moveToNextVideo, moveToPreviousVideo, skipFailedPlayback, startPlayback } from "@/lib/playback-machine";
import type { VideoItem } from "@/lib/replay-playlist";

const queue: VideoItem[] = [
  { id: "first", src: "https://cdn.example.com/first.mp4", repetitions: 2 },
  { id: "second", src: "https://cdn.example.com/second.mp4", repetitions: 3 },
];

describe("playback machine", () => {
  it("starts at the first full repetition", () => {
    expect(startPlayback(queue)).toEqual({ activeIndex: 0, remaining: 2 });
    expect(startPlayback([])).toBeNull();
  });

  it("advances either one repetition, the next video, or completion", () => {
    expect(advancePlayback(queue, { activeIndex: 0, remaining: 2 })).toEqual({ kind: "repeat", cursor: { activeIndex: 0, remaining: 1 } });
    expect(advancePlayback(queue, { activeIndex: 0, remaining: 1 })).toEqual({ kind: "next", cursor: { activeIndex: 1, remaining: 3 } });
    expect(advancePlayback(queue, { activeIndex: 1, remaining: 1 })).toEqual({ kind: "complete" });
  });

  it("moves manually between videos without changing repetition counts", () => {
    expect(moveToNextVideo(queue, 0)).toEqual({ kind: "next", cursor: { activeIndex: 1, remaining: 3 } });
    expect(moveToNextVideo(queue, 1)).toEqual({ kind: "complete" });
  });

  it("returns to the previous video and restores its skipped state", () => {
    const skipped = [{ ...queue[0], skippedRepetitions: 2 }, queue[1]];
    expect(moveToPreviousVideo(skipped, 1)).toEqual({
      cursor: { activeIndex: 0, remaining: 2 },
      queue,
    });
  });

  it("marks only the failed item's unfinished repetitions before moving on", () => {
    expect(skipFailedPlayback(queue, { activeIndex: 0, remaining: 2 })).toEqual({
      kind: "next",
      cursor: { activeIndex: 1, remaining: 3 },
      queue: [{ ...queue[0], skippedRepetitions: 2 }, queue[1]],
    });
    expect(skipFailedPlayback(queue, { activeIndex: 1, remaining: 1 })).toEqual({
      kind: "complete",
      queue: [queue[0], { ...queue[1], skippedRepetitions: 1 }],
    });
  });
});
