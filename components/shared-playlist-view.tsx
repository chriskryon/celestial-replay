"use client";

import Link from "next/link";
import { ListMusic, Play, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { ReplayPlayerSurface } from "@/components/replay-player-surface";
import { Toast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import { playbackErrorMessage } from "@/lib/playback-error";
import { savePlaylist as persistPlaylist } from "@/lib/replay-api";
import { makeItem, type VideoItem } from "@/lib/replay-playlist";
import { getPlayerStatus } from "@/lib/replay-session";
import { useAudioCache } from "@/hooks/use-audio-cache";
import { usePlaybackEngine } from "@/hooks/use-playback-engine";
import { usePlayerMedia } from "@/hooks/use-player-media";
import { useTransportShortcuts } from "@/hooks/use-transport-shortcuts";
import { useVideoMetadata } from "@/hooks/use-video-metadata";

type SharedPlaylistViewProps = {
  items: Array<{ url: string; repetitions: number }>;
  name: string;
};

// Visualização enxuta pra quem abre um link compartilhado, sem conta — monta os
// mesmos blocos que replay-studio.tsx usa (mesma engine, mesmo player), só sem o
// composer, sem retomada de sessão/histórico (não faz sentido pra playlist de
// outra pessoa) e sem se integrar ao ReplayStudio persistente do shell (esse é
// uma instância única montada no layout; essa página não precisa da persistência
// entre abas que ele existe pra dar).
export function SharedPlaylistView({ items, name }: SharedPlaylistViewProps) {
  const session = authClient.useSession();
  const isLoggedIn = Boolean(session.data?.user);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Pronto para reproduzir.");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { attemptPlay, duration, goFullscreen, handleProgress, handleRateChange, handleSeeked, handleSeekSliderChange, handleSeekSliderDown, handleSeekSliderUp, handleTimeUpdate, loaded, pip, played, playbackRate, playerRef, programmaticSeekRef, seekingRef, seekBy, setDuration, setLoaded, setPip, setPlaybackRate, setPlayed, setVolume, volume } = usePlayerMedia();

  const { activeIndex, activeVideo, canGoBackRepetition, canSkipRepetition, completedRepetitions, handleActiveTimeUpdate, handleDurationChange, handleEnded, handlePlaybackError, handlePlaybackPause, handlePlaybackPlay, handlePlaybackStarted, handlePlayerReady, hasNextVideo, hasPlaybackStarted, hasPrevVideo, isPlaying, isSessionComplete, nextVideo, playBlocked, playNextRepetition, playPreviousRepetition, previousVideo, queue, remaining, restartSession, retryCurrentVideo, setIsPlaying, startQueue, toggleMute, togglePlay, totalRepetitions, usesNativeYoutubePlaylist, videoDurations, youtubePlaylistSources } = usePlaybackEngine({
    attemptPlay,
    clearResumeSession: () => undefined,
    duration,
    error,
    handleTimeUpdate,
    mode: "playlist",
    playbackRate,
    played,
    playerRef,
    playlistInputMode: "advanced",
    playlistItems: null,
    programmaticSeekRef,
    recordCompletedVideo: () => undefined,
    seekingRef,
    setDuration,
    setError,
    setLoaded,
    setPlaybackRate,
    setPlayed,
    setStatus,
    setVolume,
    simplePlaylistItems: null,
    status,
    volume,
  });

  const previewVideo = useMemo<VideoItem | null>(() => {
    if (activeVideo || items.length === 0) return null;
    return { id: "shared-preview", src: items[0].url, repetitions: items[0].repetitions };
  }, [activeVideo, items]);
  const displayedVideo = activeVideo ?? previewVideo;
  const { isResolving: isAudioResolving, resolvedSrc: resolvedAudioSrc } = useAudioCache(displayedVideo);
  const videoMetadata = useVideoMetadata(activeVideo?.src, previewVideo?.src);
  const playerStatus = getPlayerStatus({ activeVideo, error, fallbackStatus: status, hasPlaybackStarted, isPlaying, isSessionComplete, playBlocked, previewVideo, remaining });
  const progressLabel = activeIndex === null || error ? null : `Vídeo ${activeIndex + 1} de ${queue.length} · ${completedRepetitions} de ${totalRepetitions} repetições concluídas`;

  useTransportShortcuts({ activeIndex, activeVideo, nextVideo, playerRef, previousVideo, remaining, seekBy, setIsPlaying, setVolume });

  // Só inicia com um clique de verdade — autoplay ao montar a página é bloqueado
  // pelo navegador (sem gesto do usuário) e, pior, a mensagem de "bloqueado"
  // fica escondida atrás do progressLabel assim que activeIndex deixa de ser
  // null. Mesmo padrão do botão "Iniciar playlist" do composer principal.
  const handleStart = () => {
    const nextQueue = items.map((item) => makeItem(item.url, item.repetitions));
    startQueue(nextQueue, { playImmediately: true, playlistId: null, statusMessage: `Reproduzindo vídeo 1 de ${nextQueue.length}.` });
  };

  const handleSaveToLibrary = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await persistPlaylist({ items, name });
      setSaveMessage("Playlist salva na sua biblioteca.");
    } catch {
      setSaveMessage("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-labelledby="shared-playlist-title" className="studio-shell shared-playlist-shell">
      <div className="shared-playlist-heading">
        <h1 id="shared-playlist-title"><ListMusic aria-hidden="true" size={20} />{name}</h1>
        <div className="shared-playlist-actions">
          {!activeVideo && !isSessionComplete && <button className="primary-button celestial-start-button is-ready" onClick={handleStart} type="button"><Play aria-hidden="true" size={16} />Iniciar playlist</button>}
          {isLoggedIn && <button className="secondary-button" disabled={isSaving} onClick={() => void handleSaveToLibrary()} type="button"><Save aria-hidden="true" size={16} />{isSaving ? "Salvando…" : "Salvar na minha biblioteca"}</button>}
        </div>
      </div>
      <div className="studio-grid has-media">
        <ReplayPlayerSurface
          activeIndex={activeIndex}
          activeVideo={activeVideo}
          canGoBackRepetition={canGoBackRepetition}
          canSkipRepetition={canSkipRepetition}
          completedRepetitions={completedRepetitions}
          displayedVideo={displayedVideo}
          duration={duration}
          error={error}
          hasNextVideo={hasNextVideo}
          hasPlaybackStarted={hasPlaybackStarted}
          hasPrevVideo={hasPrevVideo}
          isAudioResolving={isAudioResolving}
          isPlaying={isPlaying}
          isSessionComplete={isSessionComplete}
          loaded={loaded}
          onDurationChange={handleDurationChange}
          onEnterPictureInPicture={() => setPip(true)}
          onLeavePictureInPicture={() => setPip(false)}
          onNextRepetition={() => playNextRepetition(true)}
          onNextVideo={nextVideo}
          onPause={handlePlaybackPause}
          onPlaybackError={handlePlaybackError}
          onPlaybackPlay={handlePlaybackPlay}
          onPlaybackStarted={handlePlaybackStarted}
          onPlayerReady={handlePlayerReady}
          onPreviewError={() => setError(playbackErrorMessage(previewVideo?.src ?? ""))}
          onPreviousRepetition={playPreviousRepetition}
          onPreviousVideo={previousVideo}
          onProgress={handleProgress}
          onRateChange={handleRateChange}
          onRetry={retryCurrentVideo}
          onRestartSession={restartSession}
          onSeeked={handleSeeked}
          onSeekSliderChange={handleSeekSliderChange}
          onSeekSliderDown={handleSeekSliderDown}
          onSeekSliderUp={handleSeekSliderUp}
          onSetPlaybackRate={setPlaybackRate}
          onSetVolume={setVolume}
          onTimeUpdate={handleActiveTimeUpdate}
          onToggleMute={toggleMute}
          onTogglePlay={togglePlay}
          onTogglePip={() => setPip((value) => !value)}
          onFullscreen={goFullscreen}
          onVideoEnded={handleEnded}
          pip={pip}
          playbackRate={playbackRate}
          played={played}
          playerRef={playerRef}
          playerStatus={playerStatus}
          previewVideo={previewVideo}
          progressLabel={progressLabel}
          queue={queue}
          queueLength={queue.length}
          remaining={remaining}
          resolvedAudioSrc={resolvedAudioSrc}
          totalRepetitions={totalRepetitions}
          usesNativeYoutubePlaylist={usesNativeYoutubePlaylist}
          videoAuthor={videoMetadata.authorName}
          videoDurations={videoDurations}
          videoTitle={videoMetadata.title}
          volume={volume}
          youtubePlaylistSources={youtubePlaylistSources}
        />
      </div>
      <p className="shared-playlist-footer"><Link href="/">Criar minha própria playlist →</Link></p>
      <Toast message={saveMessage} tone={saveMessage?.startsWith("Não foi") ? "error" : "success"} />
    </section>
  );
}
