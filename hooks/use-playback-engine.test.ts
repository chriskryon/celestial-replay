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
    recordCompletedVideo: vi.fn(),
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

  return { duration, engine, error, playerRef, setDuration, setPlayed };
}

beforeEach(() => {
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

  it("advances the queue on the wall-clock deadline even when the player never reports ended (backgrounded YouTube tab)", () => {
    const { result } = renderHook(() => useTestHarness());
    const item1: VideoItem = { id: "v1", src: "https://www.youtube.com/watch?v=qqM4cAlbroQ", repetitions: 1 };
    const item2: VideoItem = { id: "v2", src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", repetitions: 1 };

    act(() => {
      result.current.engine.startQueue([item1, item2], { playlistId: null, statusMessage: "go" });
    });
    result.current.playerRef.current.duration = 100;
    act(() => {
      result.current.engine.handlePlaybackStarted(item1.id);
    });
    act(() => {
      result.current.setPlayed(0.5);
    });

    // Aba perde o foco: o YouTube congela seu relógio interno, então currentTime/
    // ended nunca acompanham o tempo real que passa.
    act(() => {
      vi.advanceTimersByTime(50000);
    });

    expect(result.current.playerRef.current.ended).toBe(false);
    expect(result.current.engine.activeIndex).toBe(1);
  });
});
