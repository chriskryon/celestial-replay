import { act, renderHook } from "@testing-library/react";
import { useState, type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePlaybackEngine } from "@/hooks/use-playback-engine";
import type { VideoItem } from "@/lib/replay-playlist";

// Elemento de vídeo falso: só os campos que o engine realmente lê/escreve
// (currentTime/duration/ended/paused, play/pause). Mutado diretamente pelos
// testes pra simular o que o player real faria.
type MockVideoElement = {
  currentTime: number;
  duration: number;
  ended: boolean;
  paused: boolean;
  pause: () => void;
  play: () => Promise<void>;
};

function createMockVideoElement(): MockVideoElement {
  return { currentTime: 0, duration: 0, ended: false, paused: true, pause: vi.fn(), play: vi.fn(() => Promise.resolve()) };
}

// Espelha como replay-studio.tsx monta o engine: duration/played/playbackRate/
// error/status/volume vêm de fora (usePlayerMedia + estado do componente) e
// são realmente reativos aqui também, não mocks estáticos — senão os efeitos
// de watchdog do hook (que dependem desses valores) nunca reagiriam.
function useTestHarness() {
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [played, setPlayed] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [status, setStatus] = useState("");
  const [volume, setVolume] = useState(0.7);
  const [playerRef] = useState(() => ({ current: createMockVideoElement() }));
  const [seekingRef] = useState(() => ({ current: false }));
  const [programmaticSeekRef] = useState(() => ({ current: false }));
  const [recordCompletedVideo] = useState(() => vi.fn());

  const engine = usePlaybackEngine({
    attemptPlay: vi.fn(() => true),
    clearResumeSession: vi.fn(),
    duration,
    error,
    handleTimeUpdate: vi.fn(),
    mode: "playlist",
    playbackRate,
    played,
    playerRef: playerRef as unknown as RefObject<HTMLVideoElement | null>,
    playlistInputMode: "advanced",
    playlistItems: null,
    programmaticSeekRef,
    recordCompletedVideo,
    seekingRef,
    setDuration,
    setError,
    setLoaded: vi.fn(),
    setPlaybackRate,
    setPlayed,
    setStatus,
    setVolume,
    simplePlaylistItems: null,
    status,
    volume,
  });

  return { duration, engine, error, playerRef, recordCompletedVideo, setDuration, setPlayed };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  // jsdom não implementa matchMedia; o watchdog de autoplay bloqueado chama isso.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePlaybackEngine", () => {
  it("skips a confirmed error by default without counting it or recording history", () => {
    const { result } = renderHook(() => useTestHarness());
    const items: VideoItem[] = ["a", "b"].map((id) => ({ id, src: `https://cdn.example.com/${id}.mp4`, repetitions: 3 }));
    act(() => result.current.engine.startQueue(items, { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackError("a"));
    expect(result.current.engine.activeVideo?.id).toBe("a");
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.engine.activeVideo?.id).toBe("b");
    expect(result.current.engine.remaining).toBe(3);
    expect(result.current.engine.isPlaying).toBe(true);
    expect(result.current.engine.completedRepetitions).toBe(0);
    expect(result.current.engine.completedQueue).toEqual([]);
    expect(result.current.engine.queue[0].skippedRepetitions).toBe(3);
    expect(result.current.recordCompletedVideo).not.toHaveBeenCalled();
    act(() => result.current.engine.handlePlaybackError("a"));
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.engine.activeVideo?.id).toBe("b");
    for (const remaining of [3, 2, 1]) {
      act(() => result.current.engine.handlePlaybackStarted("b"));
      act(() => result.current.engine.handleEnded("b", remaining));
    }
    expect(result.current.engine.completedRepetitions).toBe(3);
    expect(result.current.recordCompletedVideo).toHaveBeenCalledExactlyOnceWith(items[1]);
  });

  it("does not auto-skip a transient error if playlist playback starts", () => {
    const { result } = renderHook(() => useTestHarness());
    const items: VideoItem[] = ["a", "b"].map((id) => ({ id, src: `https://cdn.example.com/${id}.mp4`, repetitions: 1 }));
    act(() => result.current.engine.startQueue(items, { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackError("a"));
    act(() => result.current.engine.handlePlaybackStarted("a"));
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.engine.activeVideo?.id).toBe("a");
    expect(result.current.engine.queue[0].skippedRepetitions).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("persists the setting and respects disabling it while an error is pending", () => {
    const { result, unmount } = renderHook(() => useTestHarness());
    const items: VideoItem[] = ["a", "b"].map((id) => ({ id, src: `https://cdn.example.com/${id}.mp4`, repetitions: 1 }));
    act(() => result.current.engine.startQueue(items, { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackError("a"));
    act(() => result.current.engine.setAutoSkipErrors(false));
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.engine.activeVideo?.id).toBe("a");
    expect(result.current.error).not.toBeNull();
    expect(result.current.engine.remaining).toBe(1);
    unmount();
    const restored = renderHook(() => useTestHarness());
    expect(restored.result.current.engine.autoSkipErrors).toBe(false);
  });

  it("ends a queue of unavailable videos without a retry loop or completed history", () => {
    const { result } = renderHook(() => useTestHarness());
    const items: VideoItem[] = ["a", "b"].map((id) => ({ id, src: `https://cdn.example.com/${id}.mp4`, repetitions: 1 }));
    act(() => result.current.engine.startQueue(items, { playlistId: null, statusMessage: "go" }));
    for (const id of ["a", "b"]) {
      act(() => result.current.engine.handlePlaybackError(id));
      act(() => vi.advanceTimersByTime(800));
    }
    expect(result.current.engine.isSessionComplete).toBe(true);
    expect(result.current.engine.isPlaying).toBe(false);
    expect(result.current.engine.completedRepetitions).toBe(0);
    expect(result.current.recordCompletedVideo).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.engine.isPlaying).toBe(false);
    act(() => result.current.engine.restartSession());
    expect(result.current.engine.queue.every((item) => !item.skippedRepetitions)).toBe(true);
    expect(result.current.engine.activeVideo?.id).toBe("a");
  });

  it("keeps completed repetitions when only the remaining executions fail", () => {
    const { result } = renderHook(() => useTestHarness());
    const items: VideoItem[] = ["a", "b"].map((id) => ({ id, src: `https://cdn.example.com/${id}.mp4`, repetitions: 3 }));
    act(() => result.current.engine.startQueue(items, { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackStarted("a"));
    act(() => result.current.engine.handleEnded("a", 3));
    act(() => result.current.engine.handlePlaybackError("a"));
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.engine.completedRepetitions).toBe(1);
    expect(result.current.engine.queue[0].skippedRepetitions).toBe(2);
    const savedQueue = result.current.engine.queue;
    act(() => result.current.engine.resumeQueue({ queue: savedQueue, activeIndex: 1, remaining: 3, playlistName: "test", volume: 70 }));
    expect(result.current.engine.completedRepetitions).toBe(1);
  });

  it("uses the latest queue when a video is added during a pending error", () => {
    const { result } = renderHook(() => useTestHarness());
    const item: VideoItem = { id: "a", src: "https://cdn.example.com/a.mp4", repetitions: 1 };
    act(() => result.current.engine.startQueue([item], { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackError("a"));
    act(() => { result.current.engine.appendToQueue("https://cdn.example.com/b.mp4", "2"); });
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.engine.activeIndex).toBe(1);
    expect(result.current.engine.remaining).toBe(2);
    expect(result.current.engine.isSessionComplete).toBe(false);
  });

  it("appends a normalized video without interrupting the current repetition", () => {
    const { result } = renderHook(() => useTestHarness());
    const first: VideoItem = { id: "first", src: "https://cdn.example.com/first.mp4", repetitions: 2 };
    act(() => result.current.engine.startQueue([first], { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackStarted(first.id));
    result.current.playerRef.current.currentTime = 42;
    let added = false;
    act(() => { added = result.current.engine.appendToQueue("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=extra", "3"); });

    expect(added).toBe(true);
    expect(result.current.engine.queue[1]).toMatchObject({ src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", repetitions: 3 });
    expect(result.current.engine.activeVideo?.id).toBe(first.id);
    expect(result.current.engine.remaining).toBe(2);
    expect(result.current.engine.hasPlaybackStarted).toBe(true);
    expect(result.current.engine.isPlaying).toBe(true);
    expect(result.current.playerRef.current.currentTime).toBe(42);
    act(() => result.current.engine.handleEnded(first.id, 2));
    expect(result.current.engine.activeVideo?.id).toBe(first.id);
    act(() => result.current.engine.handlePlaybackStarted(first.id));
    act(() => result.current.engine.handleEnded(first.id, 1));
    expect(result.current.engine.activeIndex).toBe(1);
    expect(result.current.engine.remaining).toBe(3);
  });

  it("rejects invalid additions and additions to an idle or completed session", () => {
    const { result } = renderHook(() => useTestHarness());
    const first: VideoItem = { id: "first", src: "https://cdn.example.com/first.mp4", repetitions: 1 };
    expect(result.current.engine.appendToQueue(first.src, "1")).toBe(false);
    act(() => result.current.engine.startQueue([first], { playlistId: null, statusMessage: "go" }));
    expect(result.current.engine.appendToQueue("https://cdn.example.com/image.png", "1")).toBe(false);
    expect(result.current.engine.appendToQueue(first.src, "0")).toBe(false);
    expect(result.current.engine.appendToQueue(first.src, "1.5")).toBe(false);
    expect(result.current.engine.queue).toHaveLength(1);
    act(() => result.current.engine.handlePlaybackStarted(first.id));
    act(() => result.current.engine.handleEnded(first.id, 1));
    expect(result.current.engine.appendToQueue(first.src, "1")).toBe(false);
  });

  it("does not swallow the next ended event after an automatic playlist advance", () => {
    const { result } = renderHook(() => useTestHarness());
    const item1: VideoItem = { id: "v1", src: "https://cdn.example.com/video1.mp4", repetitions: 1 };
    const item2: VideoItem = { id: "v2", src: "https://cdn.example.com/video2.mp4", repetitions: 1 };

    act(() => {
      result.current.engine.startQueue([item1, item2], { playlistId: null, statusMessage: "go" });
    });
    act(() => {
      result.current.engine.handlePlaybackStarted(item1.id);
    });
    expect(result.current.engine.hasPlaybackStarted).toBe(true);

    act(() => {
      result.current.engine.handleEnded(item1.id, 1);
    });
    expect(result.current.engine.activeIndex).toBe(1);
    expect(result.current.engine.isSessionComplete).toBe(false);

    act(() => {
      result.current.engine.handlePlaybackPlay(item2.id);
    });
    expect(result.current.engine.hasPlaybackStarted).toBe(true);

    act(() => {
      result.current.engine.handleEnded(item2.id, 1);
    });
    expect(result.current.engine.isSessionComplete).toBe(true);
  });

  it("completes the session via the estimated-end watchdog on the very last segment, without a real ended event", () => {
    const { result } = renderHook(() => useTestHarness());
    const item1: VideoItem = { id: "v1", src: "https://cdn.example.com/video1.mp4", repetitions: 1 };

    act(() => {
      result.current.playerRef.current.duration = 100;
      result.current.engine.startQueue([item1], { playlistId: null, statusMessage: "go" });
    });
    act(() => {
      result.current.engine.handlePlaybackStarted(item1.id);
    });
    // handlePlaybackStarted lê playerRef.current.duration e propaga pra fora.
    expect(result.current.duration).toBe(100);

    act(() => {
      result.current.setPlayed(0.99);
    });

    result.current.playerRef.current.currentTime = 100;
    result.current.playerRef.current.ended = true;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.engine.isSessionComplete).toBe(true);
  });

  it("falls back to local seeking instead of the native YouTube bridge when any queue item needs more than one repetition", () => {
    const { result } = renderHook(() => useTestHarness());
    const item1: VideoItem = { id: "v1", src: "https://cdn.example.com/video1.mp4", repetitions: 1 };
    const item2: VideoItem = { id: "v2", src: "https://cdn.example.com/video2.mp4", repetitions: 2 };

    act(() => {
      result.current.engine.startQueue([item1, item2], { playlistId: null, statusMessage: "go" });
    });
    act(() => {
      result.current.engine.handlePlaybackStarted(item1.id);
    });
    act(() => {
      result.current.engine.handleEnded(item1.id, 1);
    });
    expect(result.current.engine.activeIndex).toBe(1);
    expect(result.current.engine.remaining).toBe(2);

    act(() => {
      result.current.engine.handlePlaybackStarted(item2.id);
    });

    result.current.playerRef.current.currentTime = 42;

    act(() => {
      result.current.engine.handleEnded(item2.id, 2);
    });

    // Caminho de seek local foi usado (currentTime zerado diretamente); o caminho
    // nativo (postMessage pro iframe) não teria tocado nesse campo.
    expect(result.current.playerRef.current.currentTime).toBe(0);
    expect(result.current.engine.remaining).toBe(1);
  });

  it("keeps YouTube playlist changes under the app engine instead of the native iframe playlist", () => {
    const { result } = renderHook(() => useTestHarness());
    const item1: VideoItem = { id: "v1", src: "https://www.youtube.com/watch?v=qqM4cAlbroQ", repetitions: 1 };
    const item2: VideoItem = { id: "v2", src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", repetitions: 1 };

    act(() => {
      result.current.engine.startQueue([item1, item2], { playlistId: null, statusMessage: "go" });
    });
    expect(result.current.engine.usesNativeYoutubePlaylist).toBe(false);
    act(() => {
      result.current.engine.handlePlaybackStarted(item1.id);
    });
    act(() => {
      result.current.engine.handleEnded(item1.id, 1);
    });

    expect(result.current.engine.activeIndex).toBe(1);
    expect(result.current.engine.isSessionComplete).toBe(false);
  });

  it("ignores a transient provider error when playback starts immediately after", () => {
    const { result } = renderHook(() => useTestHarness());
    const item: VideoItem = { id: "youtube", src: "https://www.youtube.com/watch?v=qqM4cAlbroQ", repetitions: 1 };

    act(() => {
      result.current.engine.startQueue([item], { playlistId: null, statusMessage: "go" });
    });
    act(() => {
      result.current.engine.handlePlaybackError(item.id);
    });
    act(() => {
      result.current.engine.handlePlaybackPlay(item.id);
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.engine.isPlaying).toBe(true);
  });

  it("ignores a late provider error while the media is already playing", () => {
    const { result } = renderHook(() => useTestHarness());
    const item: VideoItem = { id: "youtube", src: "https://www.youtube.com/watch?v=qqM4cAlbroQ", repetitions: 1 };

    act(() => {
      result.current.engine.startQueue([item], { playlistId: null, statusMessage: "go" });
    });
    result.current.playerRef.current.paused = false;
    act(() => {
      result.current.engine.handlePlaybackPlay(item.id);
      result.current.engine.handlePlaybackError(item.id);
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.engine.isPlaying).toBe(true);
  });

  it("shows a provider error when playback never starts", () => {
    const { result } = renderHook(() => useTestHarness());
    const item: VideoItem = { id: "youtube", src: "https://www.youtube.com/watch?v=qqM4cAlbroQ", repetitions: 1 };

    act(() => {
      result.current.engine.startQueue([item], { playlistId: null, statusMessage: "go" });
    });
    act(() => {
      result.current.engine.handlePlaybackError(item.id);
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.error).toContain("YouTube");
    expect(result.current.engine.isPlaying).toBe(false);
    expect(result.current.engine.remaining).toBe(1);
    expect(result.current.engine.completedRepetitions).toBe(0);
  });

  it("ignores an error from the previous video after advancing", () => {
    const { result } = renderHook(() => useTestHarness());
    const first: VideoItem = { id: "first", src: "https://cdn.example.com/first.mp4", repetitions: 1 };
    const second: VideoItem = { id: "second", src: "https://cdn.example.com/second.mp4", repetitions: 3 };

    act(() => result.current.engine.startQueue([first, second], { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackStarted(first.id));
    act(() => result.current.engine.handleEnded(first.id, 1));
    act(() => result.current.engine.handlePlaybackError(first.id));
    act(() => vi.advanceTimersByTime(800));

    expect(result.current.error).toBeNull();
    expect(result.current.engine.activeVideo?.id).toBe(second.id);
    expect(result.current.engine.remaining).toBe(3);
    expect(result.current.engine.isPlaying).toBe(true);
  });

  it("does not commit a pending error after switching to another video", () => {
    const { result } = renderHook(() => useTestHarness());
    const first: VideoItem = { id: "first", src: "https://cdn.example.com/first.mp4", repetitions: 1 };
    const second: VideoItem = { id: "second", src: "https://cdn.example.com/second.mp4", repetitions: 3 };

    act(() => result.current.engine.startQueue([first, second], { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackError(first.id));
    act(() => result.current.engine.nextVideo());
    act(() => vi.advanceTimersByTime(800));

    expect(result.current.error).toBeNull();
    expect(result.current.engine.activeVideo?.id).toBe(second.id);
    expect(result.current.engine.remaining).toBe(3);
  });

  it("preserves unfinished repetitions when the current video fails and is retried", () => {
    const { result } = renderHook(() => useTestHarness());
    const item: VideoItem = { id: "current", src: "https://cdn.example.com/current.mp4", repetitions: 3 };

    act(() => result.current.engine.startQueue([item], { playlistId: null, statusMessage: "go" }));
    act(() => result.current.engine.handlePlaybackStarted(item.id));
    act(() => result.current.engine.handleEnded(item.id, 3));
    act(() => result.current.engine.handlePlaybackError(item.id));
    act(() => vi.advanceTimersByTime(800));

    expect(result.current.error).not.toBeNull();
    expect(result.current.engine.remaining).toBe(2);
    expect(result.current.engine.completedRepetitions).toBe(1);

    act(() => result.current.engine.retryCurrentVideo());
    expect(result.current.error).toBeNull();
    expect(result.current.engine.remaining).toBe(2);
  });
});
