import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePlayerMedia } from "@/hooks/use-player-media";

const key = "celestial-replay:media-preferences";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("media preferences", () => {
  it("remembers volume and speed by default without starting playback", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    const first = renderHook(() => usePlayerMedia());
    expect(first.result.current.rememberMediaPreferences).toBe(true);
    act(() => {
      first.result.current.setVolume(0);
      first.result.current.setPlaybackRate(1.5);
    });
    first.unmount();
    const reopened = renderHook(() => usePlayerMedia());
    expect(reopened.result.current.volume).toBe(0);
    expect(reopened.result.current.playbackRate).toBe(1.5);
    expect(play).not.toHaveBeenCalled();
  });

  it("loads saved choices before writing defaults", () => {
    localStorage.setItem(key, JSON.stringify({ remember: true, volume: 0.35, playbackRate: 2 }));
    const { result } = renderHook(() => usePlayerMedia());
    expect(result.current.volume).toBe(0.35);
    expect(result.current.playbackRate).toBe(2);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ remember: true, volume: 0.35, playbackRate: 2 });
  });

  it("keeps current playback choices but forgets them when disabled", () => {
    const first = renderHook(() => usePlayerMedia());
    act(() => {
      first.result.current.setVolume(0.4);
      first.result.current.setPlaybackRate(2);
      first.result.current.setRememberMediaPreferences(false);
    });
    expect(first.result.current.volume).toBe(0.4);
    expect(first.result.current.playbackRate).toBe(2);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ remember: false });
    first.unmount();
    const reopened = renderHook(() => usePlayerMedia());
    expect(reopened.result.current.rememberMediaPreferences).toBe(false);
    expect(reopened.result.current.volume).toBe(0.7);
    expect(reopened.result.current.playbackRate).toBe(1);
    act(() => reopened.result.current.setRememberMediaPreferences(true));
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ remember: true, volume: 0.7, playbackRate: 1 });
  });

  it.each(["invalid JSON", JSON.stringify({ remember: true, volume: 2, playbackRate: -1 }), JSON.stringify({ remember: "yes", volume: 0.5 })])("ignores invalid preferences: %s", (stored) => {
    localStorage.setItem(key, stored);
    const { result } = renderHook(() => usePlayerMedia());
    expect(result.current.volume).toBe(0.7);
    expect(result.current.playbackRate).toBe(1);
  });

  it("continues working when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
    const { result } = renderHook(() => usePlayerMedia());
    act(() => { result.current.setVolume(0.3); result.current.setPlaybackRate(2); });
    expect(result.current.volume).toBe(0.3);
    expect(result.current.playbackRate).toBe(2);
  });
});
