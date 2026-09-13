"use client";

import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";

import type { VideoItem } from "@/lib/replay-playlist";

type UseTransportShortcutsParams = {
  activeIndex: number | null;
  activeVideo: VideoItem | null;
  nextVideo: () => void;
  playerRef: RefObject<HTMLVideoElement | null>;
  previousVideo: () => void;
  remaining: number;
  seekBy: (seconds: number) => void;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setVolume: Dispatch<SetStateAction<number>>;
};

// Atalhos globais do player: espaço (play/pause), M (mudo), N/B (próximo/anterior
// vídeo), J/L (±10s), setas (volume). Ignorados com o foco em um campo de formulário.
export function useTransportShortcuts({ activeIndex, activeVideo, nextVideo, playerRef, previousVideo, remaining, seekBy, setIsPlaying, setVolume }: UseTransportShortcutsParams) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, [contenteditable='true']") || !activeVideo) return;
      if (event.key === " ") {
        event.preventDefault();
        // Espaço é gesto do usuário: tenta play imperativo antes do estado.
        try {
          const node = playerRef.current;
          if (node && (node as HTMLVideoElement).paused) {
            const r = (node as HTMLVideoElement).play() as unknown as Promise<void> | undefined;
            if (r && typeof r.catch === "function") r.catch(() => undefined);
          } else node?.pause();
        } catch { /* segue para estado */ }
        setIsPlaying((value) => !value);
      }
      if (event.key.toLowerCase() === "m") setVolume((value) => value === 0 ? 0.7 : 0);
      if (event.key.toLowerCase() === "n" && activeIndex !== null) nextVideo();
      if (event.key.toLowerCase() === "b" && activeIndex !== null) previousVideo();
      if (event.key.toLowerCase() === "j") seekBy(-10);
      if (event.key.toLowerCase() === "l") seekBy(10);
      if (event.key === "ArrowUp") { event.preventDefault(); setVolume((value) => Math.min(1, Number((value + 0.05).toFixed(2)))); }
      if (event.key === "ArrowDown") { event.preventDefault(); setVolume((value) => Math.max(0, Number((value - 0.05).toFixed(2)))); }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeVideo, activeIndex, remaining]);
}
