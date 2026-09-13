"use client";

import { useEffect, useState } from "react";

import { clearPlaybackSession, loadPlaybackSession, saveHistory, savePlaybackSession } from "@/lib/replay-api";
import type { ResumableSession, VideoItem } from "@/lib/replay-playlist";

type UseSessionPersistenceParams = {
  activeIndex: number | null;
  activeVideo: VideoItem | null;
  error: string | null;
  hasPlaybackStarted: boolean;
  hasUser: boolean;
  isPlaying: boolean;
  playbackRate: number;
  queue: VideoItem[];
  queuePlaylistName: string;
  remaining: number;
  volume: number;
};

// Retoma-sessão e autosave: fala com /api/playback-session e /api/history.
// O motor de reprodução só le `resumeSession` e chama `clearResumeSession`
// nos pontos em que hoje ele já limpava a sessão salva (parar, concluir, erro).
export function useSessionPersistence({ activeIndex, activeVideo, error, hasPlaybackStarted, hasUser, isPlaying, playbackRate, queue, queuePlaylistName, remaining, volume }: UseSessionPersistenceParams) {
  const [resumeSession, setResumeSession] = useState<ResumableSession | null>(null);
  const [isDiscardResumeOpen, setIsDiscardResumeOpen] = useState(false);

  useEffect(() => {
    if (!hasUser) return;
    void loadPlaybackSession().then(setResumeSession).catch(() => undefined);
  }, [hasUser]);

  useEffect(() => {
    if (!hasUser || !isPlaying || !hasPlaybackStarted || activeIndex === null || queue.length === 0 || !activeVideo || error) return;
    const timeout = window.setTimeout(() => {
      void savePlaybackSession({ queue, activeIndex, remaining, playlistName: queuePlaylistName.trim() || "Minha playlist", volume: Math.round(volume * 100), playbackRate }).catch(() => undefined);
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, activeVideo, error, hasPlaybackStarted, hasUser, isPlaying, playbackRate, queue, queuePlaylistName, remaining, volume]);

  const clearResumeSession = () => {
    setResumeSession(null);
    if (hasUser) void clearPlaybackSession().catch(() => undefined);
  };

  const discardResume = () => {
    setResumeSession(null);
    setIsDiscardResumeOpen(false);
    void clearPlaybackSession().catch(() => undefined);
  };

  const recordCompletedVideo = (item: VideoItem, attempt = 0) => {
    // Fire-and-forget com retry: sem isso, uma falha de rede pontual
    // apaga a repetição do histórico para sempre.
    const send = () => recordCompletedVideo(item, attempt + 1);
    void saveHistory({ url: item.src, completedRepetitions: item.repetitions }).catch(() => {
      if (attempt < 2) window.setTimeout(send, 1500 * (attempt + 1));
    });
  };

  return {
    clearResumeSession,
    discardResume,
    isDiscardResumeOpen,
    recordCompletedVideo,
    resumeSession,
    setIsDiscardResumeOpen,
    setResumeSession,
  };
}
