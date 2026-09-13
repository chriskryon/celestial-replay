"use client";

import { forwardRef, type FormEvent, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ListMusic, RotateCcw, Save, Trash2, Video, X } from "lucide-react";

import { PlaybackQueue } from "@/components/playback-queue";
import { ReplayComposer } from "@/components/replay-composer";
import { ReplayPlayerSurface } from "@/components/replay-player-surface";
import { authClient } from "@/lib/auth-client";
import { playbackErrorMessage } from "@/lib/playback-error";
import { type SavedPlaylist, type VideoItem, makeDraft, makeItem } from "@/lib/replay-playlist";
import { getPlayerStatus } from "@/lib/replay-session";
import { loadPlaylists, savePlaylist as persistPlaylist } from "@/lib/replay-api";
import { canSavePlaylist } from "@/lib/replay-validation";
import { canPlaySrc } from "@/components/react-player-client";
import { usePlaybackEngine } from "@/hooks/use-playback-engine";
import { usePlayerMedia } from "@/hooks/use-player-media";
import { usePlaylistComposer } from "@/hooks/use-playlist-composer";
import { useSessionPersistence } from "@/hooks/use-session-persistence";
import { useTransportShortcuts } from "@/hooks/use-transport-shortcuts";
import { useQueueMetadata, useVideoMetadata } from "@/hooks/use-video-metadata";

export type ReplayStudioHandle = {
  nextVideo: () => void;
  seekBy: (seconds: number) => void;
  selectMode: (mode: "single" | "playlist") => void;
  toggleMute: () => void;
  togglePlayback: () => void;
};

export type PlaybackSnapshot = {
  duration: number | null;
  hasSession: boolean;
  hasNextVideo: boolean;
  hasPrevVideo: boolean;
  isPlaying: boolean;
  played: number;
  remaining: number;
  source: string | null;
  totalRepetitions: number;
  volume: number;
};

type ReplayStudioProps = {
  initialMode?: "single" | "playlist";
  onPlaybackChange?: (snapshot: PlaybackSnapshot) => void;
};

export const ReplayStudio = forwardRef<ReplayStudioHandle, ReplayStudioProps>(function ReplayStudio({ initialMode = "single", onPlaybackChange }, ref) {
  const session = authClient.useSession();
  const [queueSaveMessage, setQueueSaveMessage] = useState<string | null>(null);
  const [isSavingQueue, setIsSavingQueue] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<"draft" | "queue">("draft");
  const [saveName, setSaveName] = useState("Minha playlist");
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Cole um vídeo para preparar a repetição.");
  const routedPlaylistIdRef = useRef<string | null>(null);
  const { canSubmitPlaylist, canSubmitSingle, draftPlaylistId, drafts, firstSimplePlaylistItem, invalidSimpleLine, isSavingPlaylist, mode, playlistHint, playlistInputMode, playlistItems, playlistName, playlistSaveMessage, repetitions, setDraftPlaylistId, setDrafts, setIsSavingPlaylist, setMode, setPlaylistInputMode, setPlaylistName, setPlaylistSaveMessage, setRepetitions, setSimplePlaylist, setSource, simplePlaylist, simplePlaylistItems, simplePlaylistLineCount, singleHint, singleReplay, source, updateDraft } = usePlaylistComposer({ initialMode, setError, setStatus });
  const { attemptPlay, duration, goFullscreen, handleProgress, handleRateChange, handleSeeked, handleSeekSliderChange, handleSeekSliderDown, handleSeekSliderUp, handleTimeUpdate, loaded, pip, played, playbackRate, playerRef, programmaticSeekRef, seekingRef, seekBy, setDuration, setLoaded, setPip, setPlaybackRate, setPlayed, setVolume, volume } = usePlayerMedia();
  const playLoadedVideo = attemptPlay;
  const isLoggedIn = Boolean(session.data?.user);

  // usePlaybackEngine precisa de clearResumeSession/recordCompletedVideo (de
  // useSessionPersistence), que por sua vez precisa de activeIndex/activeVideo/
  // queue/etc (do engine) — ponte via ref pra quebrar essa dependência circular
  // sem acoplar os dois hooks um ao outro.
  const clearResumeSessionRef = useRef<() => void>(() => undefined);
  const recordCompletedVideoRef = useRef<(item: VideoItem) => void>(() => undefined);

  const { activeIndex, activeSavedPlaylistId, activeVideo, activeVideoIdRef, canGoBackRepetition, canSkipRepetition, completedQueue, completedRepetitions, endedVideoIdRef, handleActiveTimeUpdate, handleDurationChange, handleEnded, handlePlaybackError, handlePlaybackPause, handlePlaybackPlay, handlePlaybackStarted, handlePlayerReady, hasNextVideo, hasPlaybackStarted, hasPrevVideo, ignoreStaleEndedRef, isPlaying, isSessionComplete, nextVideo, playBlocked, playNextRepetition, playNextVideo, playPreviousRepetition, playPreviousVideo, previousVideo, queue, queuePlaylistName, remaining, removeFutureItem, restartSession, retryCurrentVideo, scheduledEndRef, setActiveIndex, setActiveSavedPlaylistId, setHasPlaybackStarted, setIsPlaying, setIsSessionComplete, setPlayBlocked, setQueue, setQueuePlaylistName, setRemaining, toggleMute, togglePlay, totalRepetitions, updateUpcomingItem, videoDurations, visibleQueue, youtubePlaylistSources } = usePlaybackEngine({
    attemptPlay,
    clearResumeSession: () => clearResumeSessionRef.current(),
    duration,
    error,
    handleTimeUpdate,
    mode,
    onPlaybackChange,
    playbackRate,
    played,
    playerRef,
    playlistInputMode,
    playlistItems,
    programmaticSeekRef,
    recordCompletedVideo: (item) => recordCompletedVideoRef.current(item),
    seekingRef,
    setDuration,
    setError,
    setLoaded,
    setPlayed,
    setStatus,
    setVolume,
    simplePlaylistItems,
    status,
    volume,
  });

  const { clearResumeSession, discardResume, isDiscardResumeOpen, recordCompletedVideo, resumeSession, setIsDiscardResumeOpen, setResumeSession } = useSessionPersistence({ activeIndex, activeVideo, error, hasPlaybackStarted, hasUser: isLoggedIn, isPlaying, playbackRate, queue, queuePlaylistName, remaining, volume });
  clearResumeSessionRef.current = clearResumeSession;
  recordCompletedVideoRef.current = recordCompletedVideo;

  const isEditingQueue = mode === "playlist" && activeIndex !== null && queue.length > 0 && !isSessionComplete;
  const progressLabel = activeIndex === null || error ? null : `Vídeo ${activeIndex + 1} de ${queue.length} · ${completedRepetitions} de ${totalRepetitions} repetições concluídas`;
  const previewVideo = useMemo<VideoItem | null>(() => {
    if (activeVideo) return null;
    if (mode === "single" && singleReplay) return { id: "single-preview", src: singleReplay.src, repetitions: singleReplay.count };
    if (mode !== "playlist") return null;
    if (playlistInputMode === "simple" && firstSimplePlaylistItem) return { id: "simple-playlist-preview", src: firstSimplePlaylistItem.src, repetitions: firstSimplePlaylistItem.count };
    const firstDraft = playlistItems?.[0];
    return firstDraft
      ? { id: "advanced-playlist-preview", src: firstDraft.src.trim(), repetitions: firstDraft.count }
      : null;
  }, [activeVideo, firstSimplePlaylistItem, mode, playlistInputMode, playlistItems, singleReplay]);
  const displayedVideo = activeVideo ?? previewVideo;
  const videoMetadata = useVideoMetadata(activeVideo?.src, previewVideo?.src);
  const queueMetadata = useQueueMetadata(queue.map((item) => item.src));

  const playerStatus = getPlayerStatus({ previewVideo, activeVideo, isPlaying, hasPlaybackStarted, playBlocked, isSessionComplete, error, fallbackStatus: status, remaining });

  useEffect(() => {
    if (mode !== "playlist") return;
    void loadPlaylists().then(setSavedPlaylists).catch(() => undefined);
  }, [mode]);

  useEffect(() => {
    if (mode !== "playlist" || savedPlaylists.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const playlistId = params.get("playlistId");
    if (!playlistId || routedPlaylistIdRef.current === playlistId) return;
    const playlist = savedPlaylists.find((item) => item.id === playlistId);
    if (!playlist) return;
    routedPlaylistIdRef.current = playlistId;
    const shouldAutoplay = params.get("autoplay") === "1";
    loadSavedPlaylist(playlist);
    if (shouldAutoplay) startSavedPlaylist(playlist);
    window.history.replaceState({}, "", window.location.pathname);
  }, [mode, savedPlaylists]);

  useEffect(() => {
    if (!isSaveDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSaveDialogOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaveDialogOpen]);

  const startNewPlaylist = () => {
    setDraftPlaylistId(null);
    setActiveSavedPlaylistId(null);
    setQueue([]);
    setActiveIndex(null);
    setRemaining(0);
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setError(null);
    setStatus("Monte uma playlist e inicie quando estiver tudo pronto.");
  };

  const stopPlaylist = () => {
    // Encerrar deve interromper a sessão atual, sem apagar o rascunho que o
    // usuário pode editar para montar a próxima fila.
    try { playerRef.current?.pause(); } catch { /* o estado abaixo encerra o ciclo declarativo */ }
    if (scheduledEndRef.current !== null) window.clearTimeout(scheduledEndRef.current);
    scheduledEndRef.current = null;
    activeVideoIdRef.current = null;
    endedVideoIdRef.current = null;
    ignoreStaleEndedRef.current = false;
    seekingRef.current = false;
    setQueue([]);
    setActiveSavedPlaylistId(null);
    setActiveIndex(null);
    setRemaining(0);
    setPlayed(0);
    setLoaded(0);
    setDuration(null);
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setPlayBlocked(false);
    setError(null);
    setQueueSaveMessage(null);
    setStatus("Playlist encerrada. Escolha ou monte outra para iniciar sem pressa.");
    clearResumeSession();
  };

  const resume = () => {
    if (!resumeSession) return;
    setMode("playlist");
    setQueue(resumeSession.queue);
    setActiveSavedPlaylistId(null);
    setActiveIndex(resumeSession.activeIndex);
    setRemaining(resumeSession.remaining);
    setQueuePlaylistName(resumeSession.playlistName);
    setVolume(resumeSession.volume / 100);
    setPlaybackRate(Number.isFinite(resumeSession.playbackRate) && (resumeSession.playbackRate as number) >= 0.25 && (resumeSession.playbackRate as number) <= 4 ? resumeSession.playbackRate as number : 1);
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setStatus(`Reproduzindo vídeo ${resumeSession.activeIndex + 1} de ${resumeSession.queue.length}.`);
    setResumeSession(null);
  };

  const openSaveDialog = (target: "draft" | "queue") => {
    setSaveTarget(target);
    setSaveName(target === "draft" ? playlistName : queuePlaylistName);
    setSaveDialogError(null);
    setIsSaveDialogOpen(true);
  };

  const loadSavedPlaylist = (playlist: SavedPlaylist) => {
    setDraftPlaylistId(playlist.id);
    setPlaylistName(playlist.name);
    setQueuePlaylistName(playlist.name);
    setPlaylistInputMode("advanced");
    setDrafts(playlist.items.map((item) => ({ id: crypto.randomUUID(), src: item.url, repetitions: String(item.repetitions) })));
    setError(null);
    setPlaylistSaveMessage(`Playlist “${playlist.name}” carregada. Revise ou inicie quando quiser.`);
  };

  const startSavedPlaylist = (playlist: SavedPlaylist) => {
    const nextQueue = playlist.items.map((item) => makeItem(item.url.trim(), item.repetitions));
    if (nextQueue.length === 0) return;
    setQueuePlaylistName(playlist.name);
    setQueue(nextQueue);
    setActiveSavedPlaylistId(playlist.id);
    setActiveIndex(0);
    setRemaining(nextQueue[0].repetitions);
    setPlayed(0);
    setLoaded(0);
    setDuration(null);
    seekingRef.current = false;
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setError(null);
    setStatus(`Reproduzindo vídeo 1 de ${nextQueue.length}.`);
  };

  const savePlaylist = async () => {
    const isQueue = saveTarget === "queue";
    const draftEntries = playlistInputMode === "simple" ? simplePlaylistItems : playlistItems;
    const entries = isQueue
      ? queue.map((item) => ({ url: item.src.trim(), repetitions: item.repetitions }))
      : draftEntries?.map((item) => ({ url: item.src.trim(), repetitions: item.count }));
    if (!canSavePlaylist(entries, saveName, isLoggedIn, canPlaySrc)) {
      setSaveDialogError("Informe um nome e revise os links e repetições antes de salvar.");
      return;
    }
    if (!entries) return;

    if (isQueue) setIsSavingQueue(true); else setIsSavingPlaylist(true);
    if (isQueue) setQueueSaveMessage(null); else setPlaylistSaveMessage(null);
    try {
      const playlist = await persistPlaylist({ name: saveName.trim(), items: entries });
      setSavedPlaylists((items) => [playlist, ...items.filter((item) => item.id !== playlist.id)]);
      if (isQueue) {
        setQueuePlaylistName(saveName.trim());
        setActiveSavedPlaylistId(playlist.id);
        setQueueSaveMessage("Playlist salva na sua conta.");
      } else {
        setPlaylistName(saveName.trim());
        setDraftPlaylistId(playlist.id);
        setPlaylistSaveMessage("Playlist salva na sua conta.");
      }
      setIsSaveDialogOpen(false);
    } catch {
      setSaveDialogError("Não foi possível salvar a playlist agora. Tente novamente.");
    } finally {
      if (isQueue) setIsSavingQueue(false); else setIsSavingPlaylist(false);
    }
  };

  const start = (event: FormEvent) => {
    event.preventDefault();
    // Tira o foco do botão submit: sem isso, Espaço depois do clique
    // re-dispararia o submit e reiniciaria a sessão do zero.
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) document.activeElement.blur();

    if (mode === "single") {
      if (!canSubmitSingle) {
        setError("Informe uma URL válida e um número inteiro de repetições maior que zero.");
        return;
      }
      // O preview já montou o iframe/<video> com este mesmo src.
      // Dá play NA INSTÂNCIA ATUAL dentro do clique antes de trocar o estado,
      // assim o navegador mantém o gesto de ativação e não recarrega.
      playLoadedVideo();
      const item = makeItem(singleReplay!.src, singleReplay!.count);
      setQueue([item]);
      setActiveSavedPlaylistId(null);
      setActiveIndex(0);
      setRemaining(item.repetitions);
      setPlayed(0);
      setLoaded(0);
      seekingRef.current = false;
      setIsPlaying(true);
      setHasPlaybackStarted(false);
      setIsSessionComplete(false);
      setError(null);
      setStatus(`Reproduzindo 1 de ${item.repetitions}.`);
      return;
    }

    if (!canSubmitPlaylist) {
      setError("Revise cada linha: todas precisam ter uma URL válida e pelo menos uma repetição.");
      return;
    }
    const entries = playlistInputMode === "simple" ? simplePlaylistItems! : playlistItems!;
    // Mesmo raciocínio da playlist: o preview do 1º vídeo já está montado.
    playLoadedVideo();
    const nextQueue = entries.map((item) => makeItem(item.src.trim(), item.count));
    setQueuePlaylistName(playlistName.trim() || "Minha playlist");
    setQueue(nextQueue);
    setActiveSavedPlaylistId(draftPlaylistId);
    setActiveIndex(0);
    setRemaining(nextQueue[0].repetitions);
    setPlayed(0);
    setLoaded(0);
    seekingRef.current = false;
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setError(null);
    setStatus(`Reproduzindo vídeo 1 de ${nextQueue.length}.`);
    setDuration(null);
  };

  useTransportShortcuts({ activeIndex, activeVideo, nextVideo, playerRef, previousVideo, remaining, seekBy, setIsPlaying, setVolume });

  useImperativeHandle(ref, () => ({
    nextVideo,
    seekBy,
    selectMode: setMode,
    toggleMute,
    togglePlayback: togglePlay,
  }), [nextVideo, seekBy, toggleMute, togglePlay]);

  return (
    <>
      <section className={`studio-shell${mode === "playlist" && queue.length > 0 ? " has-playback-queue" : ""}`} aria-labelledby="studio-title">
        <div className="studio-session-area">
          {resumeSession && <aside className="resume-session" aria-label="Sessão disponível para retomar"><div><strong>Continue de onde parou</strong><span>{resumeSession.playlistName} · vídeo {resumeSession.activeIndex + 1} de {resumeSession.queue.length} · repetição {Math.max(1, (resumeSession.queue[resumeSession.activeIndex]?.repetitions ?? 1) - resumeSession.remaining + 1)} de {resumeSession.queue[resumeSession.activeIndex]?.repetitions ?? 1}</span></div><div className="resume-session-actions"><button className="icon-save-button" type="button" onClick={() => setIsDiscardResumeOpen(true)} aria-label="Descartar sessão salva" title="Descartar sessão"><Trash2 aria-hidden="true" size={16} /></button><button className="secondary-button" type="button" onClick={resume}><RotateCcw aria-hidden="true" size={16} />Retomar</button></div></aside>}
        </div>

        <div className="mode-switch studio-mode-switch" role="tablist" aria-label="Modo de reprodução">
          <button className={mode === "single" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={mode === "single"} onClick={() => setMode("single")}><Video aria-hidden="true" size={16} />Vídeo único</button>
          <button className={mode === "playlist" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={mode === "playlist"} onClick={() => setMode("playlist")}><ListMusic aria-hidden="true" size={16} />Playlist</button>
        </div>

        <div className={`studio-grid ${displayedVideo ? "has-media" : "is-empty"}`}>
          <ReplayComposer
            canSubmitPlaylist={canSubmitPlaylist}
            canSubmitSingle={canSubmitSingle}
            drafts={drafts}
            error={error}
            invalidSimpleLine={invalidSimpleLine}
            isEditingQueue={isEditingQueue}
            isLoggedIn={isLoggedIn}
            isSavingPlaylist={isSavingPlaylist}
            mode={mode}
            onAddDraft={() => { setDraftPlaylistId(null); setDrafts((items) => [...items, makeDraft()]); }}
            onLoadSavedPlaylist={loadSavedPlaylist}
            onOpenSaveDialog={() => openSaveDialog("draft")}
            onPlaylistInputModeChange={setPlaylistInputMode}
            onPlaybackRateChange={setPlaybackRate}
            onRemoveDraft={(id) => { setDraftPlaylistId(null); setDrafts((items) => items.filter((item) => item.id !== id)); }}
            onRepetitionsChange={setRepetitions}
            onSimplePlaylistChange={(value) => { setDraftPlaylistId(null); setSimplePlaylist(value); setError(null); }}
            onSourceChange={(value) => { setSource(value); setError(null); }}
            onStart={start}
            onStartNewPlaylist={startNewPlaylist}
            onUpdateDraft={updateDraft}
            playbackRate={playbackRate}
            playlistHint={playlistHint}
            playlistInputMode={playlistInputMode}
            playlistSaveMessage={playlistSaveMessage}
            previewAvailable={!activeVideo && Boolean(previewVideo) && !error}
            repetitions={repetitions}
            savedPlaylists={savedPlaylists}
            simplePlaylist={simplePlaylist}
            simplePlaylistItemsCount={simplePlaylistItems?.reduce((total, item) => total + item.count, 0) ?? 0}
            simplePlaylistLineCount={simplePlaylistLineCount}
            singleHint={singleHint}
            source={source}
          />

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
            onPreviewError={() => setError(playbackErrorMessage(previewVideo?.src ?? source))}
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
            totalRepetitions={totalRepetitions}
            videoAuthor={videoMetadata.authorName}
            videoDurations={videoDurations}
            videoTitle={videoMetadata.title}
            youtubePlaylistSources={youtubePlaylistSources}
            volume={volume}
          />
        </div>

        {mode === "playlist" && queue.length > 0 && <PlaybackQueue activeIndex={activeIndex} completedQueue={isSessionComplete ? queue : completedQueue} error={error} hasPlaybackStarted={hasPlaybackStarted} isLoggedIn={isLoggedIn} isPlaying={isPlaying} isSavedPlaylist={activeSavedPlaylistId !== null} isSaving={isSavingQueue} isSessionComplete={isSessionComplete} metadata={queueMetadata} onRemoveFutureItem={removeFutureItem} onRestartSession={restartSession} onSave={() => openSaveDialog("queue")} onStartNewPlaylist={startNewPlaylist} onStop={() => setIsStopConfirmOpen(true)} onUpdateUpcomingItem={updateUpcomingItem} queue={queue} remaining={remaining} saveMessage={queueSaveMessage} visibleQueue={visibleQueue} />}
      </section>
      {isDiscardResumeOpen && <div className="confirm-backdrop" role="presentation"><section aria-labelledby="discard-resume-title" aria-modal="true" className="confirm-dialog" role="alertdialog"><h2 id="discard-resume-title">Descartar retomada?</h2><p>O ponto salvo desta playlist será removido.</p><div><button className="secondary-button" onClick={() => setIsDiscardResumeOpen(false)} type="button">Cancelar</button><button className="danger-button" onClick={discardResume} type="button">Descartar</button></div></section></div>}
      {isStopConfirmOpen && <div className="confirm-backdrop" role="presentation"><section aria-labelledby="stop-playlist-title" aria-modal="true" className="confirm-dialog" role="alertdialog"><h2 id="stop-playlist-title">Encerrar playlist?</h2><p>A reprodução será interrompida e o ponto de retomada será removido. Seus vídeos e o rascunho continuam disponíveis.</p><div><button className="secondary-button" onClick={() => setIsStopConfirmOpen(false)} type="button">Continuar</button><button className="danger-button" onClick={() => { setIsStopConfirmOpen(false); stopPlaylist(); }} type="button">Encerrar</button></div></section></div>}
      {isSaveDialogOpen && isLoggedIn && <div className="profile-backdrop" role="presentation" onMouseDown={() => setIsSaveDialogOpen(false)}>
        <section className="save-playlist-dialog" role="dialog" aria-modal="true" aria-labelledby="save-playlist-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="auth-dialog-close" type="button" onClick={() => setIsSaveDialogOpen(false)} aria-label="Fechar"><X aria-hidden="true" size={18} /></button>
          <div className="profile-heading"><span className="history-heading-icon"><Save aria-hidden="true" size={21} /></span><div><h2 id="save-playlist-title">Salvar playlist</h2><p>Escolha um nome para encontrá-la na sua biblioteca.</p></div></div>
          <label htmlFor="save-playlist-name">Nome da playlist</label>
          <input id="save-playlist-name" value={saveName} onChange={(event) => setSaveName(event.target.value)} maxLength={80} autoComplete="off" autoFocus />
          {saveDialogError && <p className="field-error" role="alert">{saveDialogError}</p>}
          <button className="primary-button" type="button" onClick={() => void savePlaylist()} disabled={!saveName.trim() || isSavingPlaylist || isSavingQueue}>{isSavingPlaylist || isSavingQueue ? "Salvando…" : "Salvar"}</button>
        </section>
      </div>}
    </>
  );
});
