"use client";

import { useRef, useState } from "react";
import screenfull from "screenfull";

export function usePlayerMedia() {
  const [duration, setDuration] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [pip, setPip] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [played, setPlayed] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const programmaticSeekRef = useRef(false);
  const seekingRef = useRef(false);

  const attemptPlay = () => {
    try {
      const node = playerRef.current as (HTMLVideoElement & {
        playVideo?: () => void;
        getInternalPlayer?: () => unknown;
      }) | null;
      if (!node) return false;
      if (typeof node.playVideo === "function") { node.playVideo(); return true; }
      if (typeof node.play === "function") {
        const result = node.play() as unknown as Promise<void> | undefined;
        if (result && typeof result.catch === "function") result.catch(() => undefined);
        return true;
      }
      const inner = node.getInternalPlayer?.() as { playVideo?: () => void; play?: () => Promise<void> } | undefined;
      if (typeof inner?.playVideo === "function") { inner.playVideo(); return true; }
      if (typeof inner?.play === "function") {
        const result = inner.play();
        if (result && typeof result.catch === "function") result.catch(() => undefined);
        return true;
      }
    } catch { /* o estado declarativo tenta em seguida */ }
    return false;
  };

  const seekBy = (seconds: number) => {
    const node = playerRef.current;
    if (!node || !Number.isFinite(node.duration) || node.duration <= 0) return;
    try { node.currentTime = Math.min(Math.max(0, node.currentTime + seconds), node.duration); } catch { /* provider sem seek */ }
  };

  const goFullscreen = () => {
    const element = document.querySelector(".replay-player");
    if (element && screenfull.isEnabled) void screenfull.request(element);
  };

  const handleRateChange = () => {
    const rate = playerRef.current?.playbackRate;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) setPlaybackRate(rate);
  };

  const handleTimeUpdate = () => {
    const node = playerRef.current;
    if (!node || seekingRef.current || !Number.isFinite(node.duration) || !node.duration) return;
    setPlayed(node.currentTime / node.duration);
  };

  const handleProgress = () => {
    const node = playerRef.current;
    if (!node || !node.buffered?.length || !Number.isFinite(node.duration) || !node.duration) return;
    try { setLoaded(node.buffered.end(node.buffered.length - 1) / node.duration); } catch { /* buffered indisponível */ }
  };

  const handleSeekSliderDown = () => { seekingRef.current = true; };
  const handleSeekSliderChange = (value: number) => {
    if (Number.isFinite(value)) setPlayed(Math.min(Math.max(0, value), 1));
  };
  const handleSeekSliderUp = (value: number) => {
    const node = playerRef.current;
    seekingRef.current = false;
    if (node && Number.isFinite(node.duration) && node.duration > 0 && Number.isFinite(value)) {
      try { node.currentTime = Math.min(Math.max(0, value), 1) * node.duration; } catch { /* provider sem seek */ }
    }
  };
  const handleSeeked = () => { programmaticSeekRef.current = false; };

  return {
    attemptPlay,
    duration,
    goFullscreen,
    handleProgress,
    handleRateChange,
    handleSeeked,
    handleSeekSliderChange,
    handleSeekSliderDown,
    handleSeekSliderUp,
    handleTimeUpdate,
    loaded,
    pip,
    played,
    playbackRate,
    playerRef,
    programmaticSeekRef,
    seekingRef,
    seekBy,
    setDuration,
    setLoaded,
    setPip,
    setPlaybackRate,
    setPlayed,
    setVolume,
    volume,
  };
}
