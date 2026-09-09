"use client";

import dynamic from "next/dynamic";
import type { RefObject, SyntheticEvent } from "react";
import { ChevronDown, Keyboard, Maximize, Pause, PictureInPicture2, Play, SkipBack, SkipForward, SlidersHorizontal, StepBack, StepForward, Volume2, VolumeX } from "lucide-react";

import { canEnablePIP } from "@/components/react-player-client";
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
  onSeeked: () => void;
  onSeekSliderChange: (value: number) => void;
  onSeekSliderDown: () => void;
  onSeekSliderUp: (value: number) => void;
  onSetPlaybackRate: (value: number) => void;
  onSetVolume: (value: number) => void;
  onTimeUpdate: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onTogglePip: () => void;
  onFullscreen: () => void;
  onVideoEnded: (videoId: string) => void;
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
  volume,
}: ReplayPlayerSurfaceProps) {
  const syncDuration = (event: SyntheticEvent<HTMLVideoElement>) => {
    const nextDuration = event.currentTarget?.duration;
    if (Number.isFinite(nextDuration) && nextDuration > 0) onDurationChange(nextDuration);
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secondsPart = totalSeconds % 60;
    const displayMinutes = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
    return `${hours > 0 ? `${hours}:` : ""}${displayMinutes}:${String(secondsPart).padStart(2, "0")}`;
  };

  const playbackProgress = totalRepetitions > 0 ? (completedRepetitions / totalRepetitions) * 100 : 0;
  const bufferedProgress = Math.max(played, Math.min(loaded, 1)) * 100;
  const videoBreaks = queue.slice(0, -1).reduce<number[]>((breaks, item) => {
    const previous = breaks.at(-1) ?? 0;
    breaks.push(previous + (item.repetitions / totalRepetitions) * 100);
    return breaks;
  }, []);

  return <div className="player-surface">
    <div className="player-status-band" role="status" aria-live="polite" aria-atomic="true">
      <div className="session-bar">
        <span>
          {progressLabel ?? playerStatus}
          {duration && activeVideo && !error && hasPlaybackStarted ? <small>≈ {Math.ceil((duration * remaining) / 60)} min neste vídeo</small> : null}
        </span>
        {activeVideo && remaining > 0 && !error && hasPlaybackStarted && <strong>{remaining} {remaining === 1 ? "repetição restante" : "repetições restantes"}</strong>}
      </div>
      {queueLength > 0 && activeIndex !== null && totalRepetitions > 0 && !error && <div className="playlist-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playbackProgress)} aria-label="Progresso da playlist"><i style={{ width: `${playbackProgress}%` }} />{videoBreaks.map((position) => <b className="playlist-progress-break" key={position} style={{ left: `${position}%` }} aria-hidden="true" />)}</div>}
    </div>

    <div className="player-stage">
      {previewVideo && !error && <span className="preview-badge">Prévia — clique em Iniciar</span>}
      {displayedVideo && !error ? <ReactPlayer
        key={displayedVideo.src}
        className="replay-player"
        ref={playerRef}
        innerRef={playerRef}
        src={displayedVideo.src}
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
        config={{ youtube: { color: "white" }, vimeo: { color: "ffffff" } }}
        onReady={activeVideo ? () => onPlayerReady(activeVideo.id) : undefined}
        onStart={activeVideo ? () => onPlaybackPlay(activeVideo.id) : undefined}
        onPlay={activeVideo ? () => onPlaybackPlay(activeVideo.id) : undefined}
        onPlaying={activeVideo ? () => onPlaybackStarted(activeVideo.id) : undefined}
        onPause={activeVideo ? () => onPause(activeVideo.id) : undefined}
        onRateChange={activeVideo ? onRateChange : undefined}
        onTimeUpdate={activeVideo ? onTimeUpdate : undefined}
        onProgress={activeVideo ? onProgress : undefined}
        onSeeked={activeVideo ? onSeeked : undefined}
        onEnterPictureInPicture={activeVideo ? onEnterPictureInPicture : undefined}
        onLeavePictureInPicture={activeVideo ? onLeavePictureInPicture : undefined}
        onEnded={activeVideo ? () => onVideoEnded(activeVideo.id) : undefined}
        onLoadedMetadata={syncDuration}
        onLoadedData={syncDuration}
        onCanPlay={syncDuration}
        onDurationChange={syncDuration}
        onError={activeVideo ? onPlaybackError : onPreviewError}
      /> : <div className="player-empty">
        <Play aria-hidden="true" size={30} />
        <p>{error ? "A reprodução foi interrompida para esta fonte." : "O player aparece aqui quando a sessão começar."}</p>
        {error && activeVideo && <div className="player-recovery">
          <button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button>
          {hasNextVideo && <button className="secondary-button" type="button" onClick={onNextVideo}>Pular vídeo</button>}
        </div>}
      </div>}
    </div>

    {activeVideo && !error && <div className="control-bar">
      <div className="control-group control-primary"><button className="pause-button" type="button" onClick={onTogglePlay}>{isPlaying && hasPlaybackStarted ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}{isPlaying ? hasPlaybackStarted ? "Pausar" : "Iniciando…" : "Continuar"}</button></div>
      <div className="control-group control-navigation" role="toolbar" aria-label="Navegar">
        {hasPrevVideo && <button className="icon-save-button" type="button" onClick={onPreviousVideo} aria-label="Vídeo anterior" title="Vídeo anterior (B)"><SkipBack aria-hidden="true" size={18} /></button>}
        <button className="icon-save-button" type="button" onClick={onPreviousRepetition} disabled={!canGoBackRepetition} aria-label="Voltar repetição" title="Voltar repetição"><StepBack aria-hidden="true" size={18} /></button>
        <button className="icon-save-button" type="button" onClick={onNextRepetition} disabled={!canSkipRepetition} aria-label="Pular repetição" title="Pular repetição"><SkipForward aria-hidden="true" size={18} /></button>
        {hasNextVideo && <button className="icon-save-button" type="button" onClick={onNextVideo} aria-label="Próximo vídeo" title="Próximo vídeo (N)"><StepForward aria-hidden="true" size={18} /></button>}
      </div>
      {duration !== null && duration > 0 && <div className="control-group seek-group control-timeline"><label className="seek-control" htmlFor="seek"><span className="seek-time">{formatTime(played * duration)}</span><input id="seek" type="range" min={0} max={0.999999} step="any" value={played} style={{ background: `linear-gradient(90deg, rgba(220,231,255,.9) ${played * 100}%, rgba(190,207,248,.35) ${played * 100}%, rgba(190,207,248,.35) ${bufferedProgress}%, rgba(190,207,248,.12) ${bufferedProgress}%)` }} onMouseDown={onSeekSliderDown} onTouchStart={onSeekSliderDown} onChange={(event) => onSeekSliderChange(Number(event.target.value))} onMouseUp={(event) => onSeekSliderUp(Number(event.currentTarget.value))} onTouchEnd={(event) => onSeekSliderUp(Number(event.currentTarget.value))} /><span className="seek-time">{formatTime(duration)}</span></label></div>}
      <details className="control-group control-preferences"><summary aria-label="Opções de reprodução" title="Opções de reprodução"><SlidersHorizontal aria-hidden="true" size={18} /><span>Opções</span><ChevronDown aria-hidden="true" size={15} /></summary><div className="preferences-popover"><label className="preferences-volume"><span>Volume</span><button className="icon-save-button" type="button" onClick={onToggleMute} aria-label={volume === 0 ? "Ativar som" : "Silenciar"} title={volume === 0 ? "Ativar som (M)" : "Silenciar (M)"}>{volume === 0 ? <VolumeX aria-hidden="true" size={18} /> : <Volume2 aria-hidden="true" size={18} />}</button><input className="volume-slider" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => onSetVolume(Number(event.target.value))} aria-label="Volume" /></label><div className="preferences-speed" role="toolbar" aria-label="Velocidade"><span>Velocidade</span>{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-pressed={playbackRate === rate} onClick={() => onSetPlaybackRate(rate)}>{rate}x</button>)}</div><div className="preferences-screen">{displayedVideo && canEnablePIP(displayedVideo.src) && <button className="icon-save-button" type="button" onClick={onTogglePip} aria-label="Picture-in-picture" title="Picture-in-picture" aria-pressed={pip}><PictureInPicture2 aria-hidden="true" size={18} /></button>}<button className="icon-save-button" type="button" onClick={onFullscreen} aria-label="Tela cheia" title="Tela cheia"><Maximize aria-hidden="true" size={18} /></button></div></div></details>
    </div>}
    {activeVideo && <details className="keyboard-help"><summary title="Ver atalhos de teclado"><Keyboard aria-hidden="true" size={14} />Atalhos</summary><p>Espaço pausa · M silencia · ↑ ↓ volume · J/L avança ou volta 10 s · N/B muda de vídeo</p></details>}
  </div>;
}
