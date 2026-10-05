import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReplayPlayerSurface } from "@/components/replay-player-surface";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

function surfaceProps(loadVideoById: (id: string) => void): Parameters<typeof ReplayPlayerSurface>[0] {
  const noop = () => undefined;
  const video = { id: "a", src: "https://www.youtube.com/watch?v=qqM4cAlbroQ", repetitions: 1 };
  return {
    activeIndex: 0, activeVideo: video, displayedVideo: video,
    autoSkipErrors: true, rememberMediaPreferences: true,
    canGoBackRepetition: false, canSkipRepetition: true, completedRepetitions: 0,
    duration: null, error: null, hasNextVideo: true, hasPlaybackStarted: false,
    hasPrevVideo: false, isPlaying: true, isSessionComplete: false, loaded: 0,
    onDurationChange: noop, onEnterPictureInPicture: noop, onLeavePictureInPicture: noop,
    onNextRepetition: noop, onNextVideo: noop, onPause: noop, onPlaybackError: noop,
    onPlaybackPlay: noop, onPlayerReady: noop, onPreviewError: noop, onPlaybackStarted: noop,
    onPreviousRepetition: noop, onPreviousVideo: noop, onProgress: noop, onRateChange: noop,
    onRetry: noop, onRestartSession: noop, onSeeked: noop, onSeekSliderChange: noop,
    onSeekSliderDown: noop, onSeekSliderUp: noop, onSetPlaybackRate: noop,
    onSetAutoSkipErrors: noop, onSetRememberMediaPreferences: noop, onSetVolume: noop,
    onTimeUpdate: noop, onToggleMute: noop, onTogglePlay: noop, onTogglePip: noop,
    onFullscreen: noop, onVideoEnded: noop, pip: false, playbackRate: 1, played: 0,
    playerRef: { current: { api: { loadVideoById } } as unknown as HTMLVideoElement },
    playerStatus: "Iniciando", playbackNotice: null, previewVideo: null,
    isAudioResolving: false, progressLabel: null, queue: [video], queueLength: 1,
    remaining: 1, resolvedAudioSrc: null, totalRepetitions: 1, usesNativeYoutubePlaylist: false,
    videoAuthor: null, videoDurations: {}, videoTitle: null, youtubePlaylistSources: [], volume: 0.7,
  };
}

describe("YouTube source transitions", () => {
  it("loads the next distinct video after an unavailable source", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const loadVideoById = vi.fn();
    const props = surfaceProps(loadVideoById);
    const failed = { id: "unavailable", src: "https://www.youtube.com/watch?v=aaaaaaaaaaa", repetitions: 1 };
    const next = { id: "next", src: "https://www.youtube.com/watch?v=jLTa3RNrnmI", repetitions: 2 };
    const view = render(<ReplayPlayerSurface {...props} activeVideo={failed} displayedVideo={failed} />);
    view.rerender(<ReplayPlayerSurface {...props} activeVideo={next} displayedVideo={next} remaining={2} playbackNotice="Vídeo pulado por erro." />);
    expect(loadVideoById).toHaveBeenCalledExactlyOnceWith("jLTa3RNrnmI");
    view.rerender(<ReplayPlayerSurface {...props} activeVideo={next} displayedVideo={next} hasPlaybackStarted remaining={2} />);
    expect(loadVideoById).toHaveBeenCalledTimes(1);
  });

  it("loads the initial source again after skipping an unavailable video", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const loadVideoById = vi.fn();
    const props = surfaceProps(loadVideoById);
    const view = render(<ReplayPlayerSurface {...props} />);
    const failed = { id: "unavailable", src: "https://www.youtube.com/watch?v=aaaaaaaaaaa", repetitions: 1 };
    view.rerender(<ReplayPlayerSurface {...props} activeVideo={failed} displayedVideo={failed} />);
    expect(loadVideoById).toHaveBeenLastCalledWith("aaaaaaaaaaa");
    view.rerender(<ReplayPlayerSurface {...props} playbackNotice="Vídeo pulado por erro." />);
    expect(loadVideoById).toHaveBeenLastCalledWith("qqM4cAlbroQ");
    expect(loadVideoById).toHaveBeenCalledTimes(2);
    view.rerender(<ReplayPlayerSurface {...props} remaining={2} />);
    expect(loadVideoById).toHaveBeenCalledTimes(2);
  });
});
