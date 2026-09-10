"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject, type SyntheticEvent } from "react";
import { Clapperboard, Keyboard, Maximize, MoreHorizontal, Pause, PictureInPicture2, Play, Repeat2, SkipBack, SkipForward, StepBack, StepForward, Volume2, VolumeX, X } from "lucide-react";

import { canEnablePIP } from "@/components/react-player-client";
import { buildPlaylistSegments } from "@/lib/playback-progress";
import { formatRemainingTime, formatTime, getHostname } from "@/lib/formatters";
import type { VideoItem } from "@/lib/replay-playlist";

const ReactPlayer = dynamic(() => import("@/components/react-player-client"), { ssr: false });

type ReplayPlayerSurfaceProps = {
  activeIndex: number | null;
  activeVideo: VideoItem | null;
  canGoBackRepetition: boolean;
  canSkipRepetition: boolean;
  completedRepetitions: number;
  displayedVideo: VideoItem | null;
  duration: number | null;
  error: string | null;
  hasNextVideo: boolean;
  hasPlaybackStarted: boolean;
  hasPrevVideo: boolean;
  isPlaying: boolean;
  isSessionComplete: boolean;
  loaded: number;
  onDurationChange: (duration: number) => void;
  onEnterPictureInPicture: () => void;
  onLeavePictureInPicture: () => void;
  onNextRepetition: () => void;
  onNextVideo: () => void;
  onPause: (videoId: string) => void;
  onPlaybackError: () => void;
  onPlaybackPlay: (videoId: string) => void;
  onPlayerReady: (videoId: string) => void;
  onPreviewError: () => void;
  onPlaybackStarted: (videoId: string) => void;
  onPreviousRepetition: () => void;
  onPreviousVideo: () => void;
  onProgress: () => void;
  onRateChange: () => void;
  onRetry: () => void;
  onRestartSession: () => void;
  onSeeked: () => void;
  onSeekSliderChange: (value: number) => void;
  onSeekSliderDown: () => void;
  onSeekSliderUp: (value: number) => void;
  onSetPlaybackRate: (value: number) => void;
  onSetVolume: (value: number) => void;
  onTimeUpdate: (videoId: string) => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onTogglePip: () => void;
  onFullscreen: () => void;
  onVideoEnded: (videoId: string, expectedRemaining: number) => void;
  pip: boolean;
  playbackRate: number;
  played: number;
  playerRef: RefObject<HTMLVideoElement | null>;
  playerStatus: string;
  previewVideo: VideoItem | null;
  progressLabel: string | null;
  queue: VideoItem[];
  queueLength: number;
  remaining: number;
  totalRepetitions: number;
  videoAuthor: string | null;
  videoDurations: Record<string, number>;
  videoTitle: string | null;
  youtubePlaylistSources: string[];
  volume: number;
};

export function ReplayPlayerSurface({
  activeIndex,
  activeVideo,
  canGoBackRepetition,
  canSkipRepetition,
  completedRepetitions,
  displayedVideo,
  duration,
  error,
  hasNextVideo,
  hasPlaybackStarted,
  hasPrevVideo,
  isPlaying,
  isSessionComplete,
  loaded,
  onDurationChange,
  onEnterPictureInPicture,
  onLeavePictureInPicture,
  onNextRepetition,
  onNextVideo,
  onPause,
  onPlaybackError,
  onPlaybackPlay,
  onPlayerReady,
  onPreviewError,
  onPlaybackStarted,
  onPreviousRepetition,
  onPreviousVideo,
  onProgress,
  onRateChange,
  onRetry,
  onRestartSession,
  onSeeked,
  onSeekSliderChange,
  onSeekSliderDown,
  onSeekSliderUp,
  onSetPlaybackRate,
  onSetVolume,
  onTimeUpdate,
  onToggleMute,
  onTogglePlay,
  onTogglePip,
  onFullscreen,
  onVideoEnded,
  pip,
  playbackRate,
  played,
  playerRef,
  playerStatus,
  previewVideo,
  progressLabel,
  queue,
  queueLength,
  remaining,
  totalRepetitions,
  videoAuthor,
  videoDurations,
  videoTitle,
  youtubePlaylistSources,
  volume,
}: ReplayPlayerSurfaceProps) {
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const mobileOptionsDialogRef = useRef<HTMLDialogElement>(null);
  const playerStageRef = useRef<HTMLDivElement>(null);
  const previousStageLayout = useRef<{ rect: DOMRect; state: string } | null>(null);
  const stageAnimation = useRef<Animation | null>(null);

  useEffect(() => {
    const dialog = mobileOptionsDialogRef.current;
    if (!dialog) return;

    if (isMobileOptionsOpen && !dialog.open) dialog.showModal();
    if (!isMobileOptionsOpen && dialog.open) dialog.close();
  }, [isMobileOptionsOpen]);

  const renderMoreOptions = () => <>
    <div className="player-mobile-repeat-actions" role="toolbar" aria-label="Repetições">
      <button className="icon-save-button" type="button" onClick={onPreviousRepetition} disabled={!canGoBackRepetition} aria-label="Voltar repetição"><StepBack aria-hidden="true" size={18} /></button>
      <button className="icon-save-button" type="button" onClick={onNextRepetition} disabled={!canSkipRepetition} aria-label="Pular repetição"><SkipForward aria-hidden="true" size={18} /></button>
    </div>
    <div className="player-speed-control" role="toolbar" aria-label="Velocidade">{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-label={`Velocidade ${rate}x`} aria-pressed={playbackRate === rate} onClick={() => onSetPlaybackRate(rate)}>{rate}x</button>)}</div>
    <div className="player-display-control" role="toolbar" aria-label="Exibição">{displayedVideo && canEnablePIP(displayedVideo.src) && <button className="icon-save-button" type="button" onClick={onTogglePip} aria-label="Picture-in-picture" title="Picture-in-picture" aria-pressed={pip}><PictureInPicture2 aria-hidden="true" size={18} /></button>}<button className="icon-save-button" type="button" onClick={onFullscreen} aria-label="Tela cheia" title="Tela cheia"><Maximize aria-hidden="true" size={18} /></button></div>
    <details className="player-more-shortcuts"><summary><Keyboard aria-hidden="true" size={14} />Atalhos</summary><p>Espaço pausa · M silencia · ↑ ↓ volume · J/L avança ou volta 10 s · N/B muda de vídeo</p></details>
  </>;
  const syncDuration = (event: SyntheticEvent<HTMLVideoElement>) => {
    const nextDuration = event.currentTarget?.duration;
    if (Number.isFinite(nextDuration) && nextDuration > 0) onDurationChange(nextDuration);
  };


  const currentRepetitionProgress = activeVideo && hasPlaybackStarted ? Math.max(0, Math.min(1, played)) : 0;
  const bufferedProgress = Math.max(played, Math.min(loaded, 1)) * 100;
  const playlistSegments = buildPlaylistSegments(queue, videoDurations, activeVideo?.id, duration);
  const totalPlaylistDuration = playlistSegments.reduce((total, segment) => total + segment.weight, 0);
  const completedPlaylistDuration = playlistSegments.slice(0, completedRepetitions).reduce((total, segment) => total + segment.weight, 0);
  const activeSegmentDuration = playlistSegments[completedRepetitions]?.weight ?? 0;
  const effectivePlaybackRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
  const playbackProgress = totalPlaylistDuration > 0
    ? ((completedPlaylistDuration + activeSegmentDuration * currentRepetitionProgress) / totalPlaylistDuration) * 100
    : 0;
  const remainingPlaylistDuration = Math.max(0, totalPlaylistDuration - completedPlaylistDuration - activeSegmentDuration * currentRepetitionProgress);
  const durationStatus = queueLength > 1 && activeVideo && !error && hasPlaybackStarted && totalPlaylistDuration > 0
    ? `≈ ${formatRemainingTime(remainingPlaylistDuration / effectivePlaybackRate)} restantes`
    : duration && activeVideo && !error && hasPlaybackStarted
      ? `≈ ${Math.ceil((duration * remaining) / effectivePlaybackRate / 60)} min neste vídeo`
      : null;
  const youtubePlaylistIds = youtubePlaylistSources
    .map((source) => source.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/)?.[1])
    .filter((id): id is string => Boolean(id));
  const useNativeYoutubePlaylist = Boolean(activeVideo) && youtubePlaylistIds.length > 1;
  const playerSource = useNativeYoutubePlaylist ? youtubePlaylistSources[0] : displayedVideo?.src;
  const sourceHost = displayedVideo?.src ? getHostname(displayedVideo.src) : "";
  const fallbackTitle = sourceHost.includes("youtube") || sourceHost === "youtu.be" ? "Vídeo do YouTube" : "Vídeo em reprodução";
  const completeTitle = queueLength > 1 ? "Playlist concluída" : "Vídeo concluído";

  const playerSurfaceState = activeVideo ? "is-active" : previewVideo ? "is-preview" : "is-empty";

  useLayoutEffect(() => {
    const stage = playerStageRef.current;
    if (!stage) return;

    const nextRect = stage.getBoundingClientRect();
    const previous = previousStageLayout.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    stageAnimation.current?.cancel();
    if (previous?.state === "is-preview" && playerSurfaceState === "is-active" && !reducedMotion && nextRect.width > 0 && nextRect.height > 0) {
      const scaleX = previous.rect.width / nextRect.width;
      const scaleY = previous.rect.height / nextRect.height;
      const translateX = previous.rect.left - nextRect.left;
      const translateY = previous.rect.top - nextRect.top;

      stageAnimation.current = stage.animate([
        { transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`, transformOrigin: "center center" },
        { transform: "translate(0, 0) scale(1, 1)", transformOrigin: "center center" },
      ], { duration: 360, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" });
    }

    previousStageLayout.current = { rect: nextRect, state: playerSurfaceState };
  }, [playerSurfaceState]);

  return <div className={`player-surface ${playerSurfaceState}`}>
    <div className="player-status-band">
      <div className="session-bar">
        <div className="player-context">
          <span className="player-context-icon"><Clapperboard aria-hidden="true" size={17} /></span>
          <div className="player-context-copy">
            {displayedVideo && <strong className="player-video-title" title={videoTitle ?? displayedVideo.src}>{videoTitle ?? fallbackTitle}</strong>}
            <small className="player-video-author">{videoAuthor ?? sourceHost}</small>
            <span className="player-context-status" role="status" aria-live="polite">{progressLabel ?? playerStatus}</span>
            {durationStatus ? <small className="player-context-duration">{durationStatus}</small> : null}
          </div>
        </div>
        {activeVideo && remaining > 0 && !error && hasPlaybackStarted && <span className="player-repeat-badge"><Repeat2 aria-hidden="true" size={14} />{remaining} {remaining === 1 ? "repetição restante" : "repetições restantes"}</span>}
      </div>
      {queueLength > 0 && activeIndex !== null && totalRepetitions > 0 && !error && <>
        <div className="playlist-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playbackProgress)} aria-label={`Progresso da playlist: ${completedRepetitions} de ${totalRepetitions} repetições concluídas`} style={{ "--playlist-progress": playbackProgress / 100 } as CSSProperties}>
          {playlistSegments.map((segment, index) => <span key={segment.id} className={`playlist-progress-segment tone-${segment.tone}${index < completedRepetitions ? " is-complete" : ""}${index === completedRepetitions ? " is-current" : ""}`} style={{ "--segment-weight": segment.weight, ...(index === completedRepetitions ? { "--segment-progress": currentRepetitionProgress } : {}) } as CSSProperties} title={`${segment.label} · ≈ ${formatTime(segment.weight)}`} aria-hidden="true" />)}
        </div>
      </>}
    </div>

    <div className="player-stage-motion" ref={playerStageRef}>
      <div className="player-stage">
      {isSessionComplete && <div className="player-complete-state">
        <strong>{completeTitle}</strong>
        <span>{queueLength} {queueLength === 1 ? "vídeo" : "vídeos"} · {totalRepetitions} {totalRepetitions === 1 ? "repetição" : "repetições"}</span>
        <button className="primary-button" type="button" onClick={onRestartSession}>Reproduzir novamente</button>
      </div>}
      {previewVideo && !error && <span className="preview-badge">Prévia carregada — nada toca ainda</span>}
      {playerSource && !error && !isSessionComplete ? <ReactPlayer
        key={useNativeYoutubePlaylist ? youtubePlaylistIds.join(",") : displayedVideo?.src}
        className="replay-player"
        ref={playerRef}
        innerRef={playerRef}
        src={playerSource}
        playing={activeVideo ? isPlaying : false}
        preload="auto"
        light={false}
        controls
        playsInline
        volume={volume}
        muted={volume === 0}
        playbackRate={playbackRate}
        pip={pip}
        width="100%"
        style={{ width: "100%", height: "auto", aspectRatio: "16/9" }}
        config={{ youtube: { color: "white", ...(useNativeYoutubePlaylist ? { playlist: youtubePlaylistIds.join(",") } : {}) }, vimeo: { color: "ffffff" } }}
        onReady={activeVideo ? () => onPlayerReady(activeVideo.id) : undefined}
        onStart={activeVideo ? () => onPlaybackPlay(activeVideo.id) : undefined}
        onPlay={activeVideo ? () => onPlaybackPlay(activeVideo.id) : undefined}
        onPlaying={activeVideo ? () => onPlaybackStarted(activeVideo.id) : undefined}
        onPause={activeVideo ? () => onPause(activeVideo.id) : undefined}
        onRateChange={activeVideo ? onRateChange : undefined}
        onTimeUpdate={activeVideo ? () => onTimeUpdate(activeVideo.id) : undefined}
        onProgress={activeVideo ? onProgress : undefined}
        onSeeked={activeVideo ? onSeeked : undefined}
        onEnterPictureInPicture={activeVideo ? onEnterPictureInPicture : undefined}
        onLeavePictureInPicture={activeVideo ? onLeavePictureInPicture : undefined}
        onEnded={activeVideo ? () => onVideoEnded(activeVideo.id, remaining) : undefined}
        onLoadedMetadata={syncDuration}
        onLoadedData={syncDuration}
        onCanPlay={syncDuration}
        onDurationChange={syncDuration}
        onError={activeVideo ? onPlaybackError : onPreviewError}
      /> : <div className="player-empty">
        <span className="player-empty-icon"><Play aria-hidden="true" size={25} /></span>
        <div>
          <strong>{error ? "Não foi possível carregar esta fonte" : "Cole um vídeo para preparar a repetição"}</strong>
          <p>{error ? "Tente novamente ou escolha outra fonte suportada." : "A prévia aparece aqui antes de qualquer reprodução."}</p>
          {!error && <small>Nada toca sem você clicar em Iniciar.</small>}
        </div>
        {error && activeVideo && <div className="player-recovery">
          <button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button>
          {hasNextVideo && <button className="secondary-button" type="button" onClick={onNextVideo}>Pular vídeo</button>}
        </div>}
      </div>}
      </div>
    </div>

    {activeVideo && !error && <div className="control-bar">
      <div className="control-group control-primary"><button className="pause-button" type="button" onClick={onTogglePlay} aria-label={isPlaying ? hasPlaybackStarted ? "Pausar" : "Iniciando" : "Continuar"} title={isPlaying ? hasPlaybackStarted ? "Pausar" : "Iniciando" : "Continuar"}>{isPlaying && hasPlaybackStarted ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}</button></div>
      <div className="control-group control-navigation" role="toolbar" aria-label="Navegar">
        {hasPrevVideo && <button className="icon-save-button player-video-previous" type="button" onClick={onPreviousVideo} aria-label="Vídeo anterior" title="Vídeo anterior (B)"><SkipBack aria-hidden="true" size={18} /></button>}
        <button className="icon-save-button player-repetition-previous" type="button" onClick={onPreviousRepetition} disabled={!canGoBackRepetition} aria-label="Voltar repetição" title="Voltar repetição"><StepBack aria-hidden="true" size={18} /></button>
        <button className="icon-save-button player-repetition-next" type="button" onClick={onNextRepetition} disabled={!canSkipRepetition} aria-label="Pular repetição" title="Pular repetição"><SkipForward aria-hidden="true" size={18} /></button>
        {hasNextVideo && <button className="icon-save-button player-video-next" type="button" onClick={onNextVideo} aria-label="Próximo vídeo" title="Próximo vídeo (N)"><StepForward aria-hidden="true" size={18} /></button>}
      </div>
      {activeVideo && !error && <div className="control-group seek-group control-timeline"><label className="seek-control" htmlFor="seek"><span className="seek-time">{duration ? formatTime(played * duration) : <span className="cosmic-skeleton seek-time-skeleton" aria-label="Carregando tempo atual" />}</span><input className="celestial-seek" id="seek" type="range" min={0} max={0.999999} step="any" value={duration ? played : 0} disabled={!duration} aria-busy={!duration} style={{ "--seek-played": `${played * 100}%`, "--seek-buffered": `${bufferedProgress}%` } as CSSProperties} onMouseDown={onSeekSliderDown} onTouchStart={onSeekSliderDown} onChange={(event) => onSeekSliderChange(Number(event.target.value))} onMouseUp={(event) => onSeekSliderUp(Number(event.currentTarget.value))} onTouchEnd={(event) => onSeekSliderUp(Number(event.currentTarget.value))} /><span className="seek-time">{duration ? formatTime(duration) : <span className="cosmic-skeleton seek-time-skeleton" aria-label="Carregando duração" />}</span></label></div>}
    </div>}
    {activeVideo && !error && <div className="player-preferences-strip" role="group" aria-label="Preferências de reprodução">
    <label className="player-volume-control"><button className="icon-save-button" type="button" onClick={onToggleMute} aria-label={volume === 0 ? "Ativar som" : "Silenciar"} title={volume === 0 ? "Ativar som (M)" : "Silenciar (M)"}>{volume === 0 ? <VolumeX aria-hidden="true" size={18} /> : <Volume2 aria-hidden="true" size={18} />}</button><input className="volume-slider celestial-volume" type="range" min="0" max="1" step="0.05" value={volume} style={{ "--volume-level": `${volume * 100}%` } as CSSProperties} onChange={(event) => onSetVolume(Number(event.target.value))} aria-label="Volume" /></label>
      <span className="player-preferences-divider" aria-hidden="true" />
      <div className="player-secondary-controls">
        <div className="player-speed-control" role="toolbar" aria-label="Velocidade">{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-label={`Velocidade ${rate}x`} aria-pressed={playbackRate === rate} onClick={() => onSetPlaybackRate(rate)}>{rate}x</button>)}</div>
        <span className="player-preferences-divider" aria-hidden="true" />
        <div className="player-display-control" role="toolbar" aria-label="Exibição">{displayedVideo && canEnablePIP(displayedVideo.src) && <button className="icon-save-button" type="button" onClick={onTogglePip} aria-label="Picture-in-picture" title="Picture-in-picture" aria-pressed={pip}><PictureInPicture2 aria-hidden="true" size={18} /></button>}<button className="icon-save-button" type="button" onClick={onFullscreen} aria-label="Tela cheia" title="Tela cheia"><Maximize aria-hidden="true" size={18} /></button></div>
      </div>
      <details className="player-more-menu">
        <summary aria-label="Mais opções" title="Mais opções"><MoreHorizontal aria-hidden="true" size={18} /></summary>
        <div className="player-more-panel">{renderMoreOptions()}</div>
      </details>
      <button className="player-mobile-options-trigger" type="button" onClick={() => setIsMobileOptionsOpen(true)} aria-haspopup="dialog" aria-label="Mais opções"><MoreHorizontal aria-hidden="true" size={20} /></button>
    </div>}
    <dialog ref={mobileOptionsDialogRef} className="player-mobile-sheet" aria-labelledby="mobile-options-title" onCancel={() => setIsMobileOptionsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setIsMobileOptionsOpen(false); }}>
      <div className="player-mobile-sheet-content">
        <div className="player-mobile-sheet-heading"><div><span>Preferências</span><h2 id="mobile-options-title">Mais opções</h2></div><button className="icon-save-button" type="button" onClick={() => setIsMobileOptionsOpen(false)} aria-label="Fechar opções"><X aria-hidden="true" size={18} /></button></div>
        {renderMoreOptions()}
      </div>
    </dialog>
    {activeVideo && <details className="keyboard-help"><summary title="Ver atalhos de teclado"><Keyboard aria-hidden="true" size={14} />Atalhos</summary><p>Espaço pausa · M silencia · ↑ ↓ volume · J/L avança ou volta 10 s · N/B muda de vídeo</p></details>}
  </div>;
}
