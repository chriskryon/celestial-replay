"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

import { canPlaySrc } from "@/components/react-player-client";
import type { PlaybackSnapshot } from "@/components/replay-studio";
import { playbackErrorMessage } from "@/lib/playback-error";
import { isPlayableItem, type ParsedPlaylistItem, type ResumableSession, type VideoItem } from "@/lib/replay-playlist";
import { getPlaybackSnapshot } from "@/lib/replay-session";

type UsePlaybackEngineParams = {
  attemptPlay: () => boolean;
  clearResumeSession: () => void;
  duration: number | null;
  error: string | null;
  handleTimeUpdate: () => void;
  mode: "single" | "playlist";
  onPlaybackChange?: (snapshot: PlaybackSnapshot) => void;
  playbackRate: number;
  played: number;
  playerRef: RefObject<HTMLVideoElement | null>;
  playlistInputMode: "simple" | "advanced";
  playlistItems: ParsedPlaylistItem[] | null;
  programmaticSeekRef: RefObject<boolean>;
  recordCompletedVideo: (item: VideoItem) => void;
  seekingRef: RefObject<boolean>;
  setDuration: Dispatch<SetStateAction<number | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setLoaded: Dispatch<SetStateAction<number>>;
  setPlaybackRate: Dispatch<SetStateAction<number>>;
  setPlayed: Dispatch<SetStateAction<number>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setVolume: Dispatch<SetStateAction<number>>;
  simplePlaylistItems: ParsedPlaylistItem[] | null;
  status: string;
  volume: number;
};

function isMediaActuallyPlaying(node: HTMLVideoElement | null) {
  return Boolean(node && !node.paused && !node.ended);
}

function hasMediaReachedEnd(node: HTMLVideoElement | null) {
  if (!node) return false;
  if (node.ended) return true;
  return Number.isFinite(node.duration)
    && node.duration > 0
    && Number.isFinite(node.currentTime)
    && node.currentTime >= node.duration - 0.08;
}

// O "motor" de reprodução: fila, avanço/repetição, a ponte com playlist nativa
// do YouTube e os watchdogs de `ended`/autoplay bloqueado. Núcleo mais crítico
// do player — os 5 pontos endurecidos no commit `6c989e5` (mobile) precisam
// continuar exatamente como estão aqui.
export function usePlaybackEngine({ attemptPlay, clearResumeSession, duration, error, handleTimeUpdate, mode, onPlaybackChange, playbackRate, played, playerRef, playlistInputMode, playlistItems, programmaticSeekRef, recordCompletedVideo, seekingRef, setDuration, setError, setLoaded, setPlaybackRate, setPlayed, setStatus, setVolume, simplePlaylistItems, status, volume }: UsePlaybackEngineParams) {
  const [activeSavedPlaylistId, setActiveSavedPlaylistId] = useState<string | null>(null);
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [queuePlaylistName, setQueuePlaylistName] = useState("Minha playlist");
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const activeVideoIdRef = useRef<string | null>(null);
  const endedVideoIdRef = useRef<string | null>(null);
  const ignoreStaleEndedRef = useRef(false);
  const scheduledEndRef = useRef<number | null>(null);

  const { activeVideo, completedQueue, completedRepetitions, hasNextVideo, hasPrevVideo, totalRepetitions, visibleQueue } = getPlaybackSnapshot(queue, activeIndex, remaining);
  activeVideoIdRef.current = activeVideo?.id ?? null;
  const youtubePlaylistItems = useMemo(() => {
    if (activeVideo) return queue.map((item) => ({ repetitions: item.repetitions, src: item.src }));
    if (mode !== "playlist") return [];
    const entries = playlistInputMode === "simple" ? simplePlaylistItems : playlistItems;
    return entries?.map((item) => ({ repetitions: item.count, src: item.src })) ?? [];
  }, [activeVideo, mode, playlistInputMode, playlistItems, queue, simplePlaylistItems]);
  const youtubePlaylistSources = useMemo(() => youtubePlaylistItems.map((item) => item.src), [youtubePlaylistItems]);
  // Playlist nativa do YouTube não sabe "repetir este item N vezes" — se algum
  // item exige mais de 1 repetição, usamos nosso próprio motor de troca de vídeo.
  const usesNativeYoutubePlaylist = youtubePlaylistSources.length > 1 && youtubePlaylistItems.every((item) => item.repetitions === 1);
  const canSkipRepetition = activeVideo !== null && (remaining > 1 || hasNextVideo);
  const canGoBackRepetition = activeVideo !== null && activeIndex !== null && remaining < activeVideo.repetitions;

  const playLoadedVideo = attemptPlay;

  // Guia inativa: timers e eventos de mídia são estrangulados em background,
  // então o `ended` pode nunca chegar. Ao voltar o foco, reconcilia pelo
  // estado real do elemento (.ended/.paused).
  useEffect(() => {
    const reconcile = () => {
      if (typeof document === "undefined" || document.hidden) return;
      if (!activeVideo || activeIndex === null || error) return;
      const node = playerRef.current;
      if (!node) return;
      try {
        if ((node as HTMLVideoElement).ended) {
          handleEnded(activeVideo.id, remaining);
        } else if (isPlaying && (node as HTMLVideoElement).paused) {
          attemptPlay();
        }
      } catch { /* próximo foco tenta de novo */ }
    };
    document.addEventListener("visibilitychange", reconcile);
    window.addEventListener("focus", reconcile);
    return () => {
      document.removeEventListener("visibilitychange", reconcile);
      window.removeEventListener("focus", reconcile);
    };
  }, [activeVideo?.id, activeIndex, remaining, isPlaying, error]);
  // Watchdog: o Player.js interno tenta play() uma única vez por render.
  useEffect(() => {
    if (!activeVideo || !isPlaying || hasPlaybackStarted || error) { setPlayBlocked(false); return; }
    const currentVideoId = activeVideo.id;
    setPlayBlocked(false);
    attemptPlay();
    const interval = window.setInterval(() => {
      try {
        const node = playerRef.current;
        if (!node) return;
        if (isMediaActuallyPlaying(node)) {
          handlePlaybackStarted(currentVideoId);
          return;
        }
        if ((node as HTMLVideoElement).paused) {
          const r = (node as HTMLVideoElement).play() as unknown as Promise<void> | undefined;
          if (r && typeof r.catch === "function") r.catch(() => undefined);
        }
      } catch { /* tenta no próximo tick */ }
    }, 600);
    // Em mobile o bloqueio de autoplay é bem mais comum; esperar 8s parado em
    // "Iniciando…" passa a impressão de travamento, então damos essa notícia antes.
    const isMobileViewport = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
    const timeout = window.setTimeout(() => {
      if (isMediaActuallyPlaying(playerRef.current)) {
        handlePlaybackStarted(currentVideoId);
        return;
      }
      setPlayBlocked(true);
    }, isMobileViewport ? 3000 : 8000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [activeVideo?.id, isPlaying, hasPlaybackStarted, error]);

  useEffect(() => {
    if (scheduledEndRef.current !== null) window.clearTimeout(scheduledEndRef.current);
    scheduledEndRef.current = null;
    // Enquanto o usuário arrasta a barra de busca, `played` já reflete a posição
    // do arrasto (pro slider acompanhar visualmente) mas o vídeo real só pula
    // pra lá ao soltar — se essa posição for perto do fim, um watchdog armado
    // durante o arrasto dispararia logo após soltar e contaria a repetição como
    // concluída mesmo que o usuário só tenha espiado o final, sem assistir.
    if (!activeVideo || !isPlaying || !hasPlaybackStarted || error || duration === null || duration <= 0 || seekingRef.current) return;
    const effectiveRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
    const remainingTime = Math.max(0, (duration * (1 - played) - 0.08) / effectiveRate);
    scheduledEndRef.current = window.setTimeout(() => {
      scheduledEndRef.current = null;
      if (hasMediaReachedEnd(playerRef.current)) handleEnded(activeVideo.id, remaining);
    }, remainingTime * 1000);
    return () => {
      if (scheduledEndRef.current !== null) window.clearTimeout(scheduledEndRef.current);
      scheduledEndRef.current = null;
    };
  }, [activeVideo?.id, duration, error, hasPlaybackStarted, isPlaying, playbackRate, played, remaining]);

  useEffect(() => {
    if (!activeVideo || activeIndex === null || !isPlaying || !hasPlaybackStarted || error || seekingRef.current) return;
    const interval = window.setInterval(() => {
      const node = playerRef.current;
      if (!node) return;
      try {
        if (usesNativeYoutubePlaylist && remaining === 1 && played > 0.9 && Number.isFinite(node.currentTime) && node.currentTime < 0.5) {
          playNextVideo(false);
          return;
        }
        if (hasMediaReachedEnd(node)) handleEnded(activeVideo.id, remaining);
      } catch { /* o próximo tick tenta de novo */ }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeVideo?.id, activeIndex, error, hasPlaybackStarted, isPlaying, played, remaining, usesNativeYoutubePlaylist]);

  const removeFutureItem = (id: string) => {
    // Só itens após o atual podem sair; o resto desloca sem mexer no índice ativo.
    setQueue((items) => {
      const idx = items.findIndex((item) => item.id === id);
      if (idx < 0 || (activeIndex !== null && idx <= activeIndex)) return items;
      return items.filter((item) => item.id !== id);
    });
    setError(null);
  };

  const updateUpcomingItem = (id: string, field: "src" | "repetitions", value: string) => {
    setQueue((items) => items.map((item) => {
      if (item.id !== id) return item;
      return field === "src" ? { ...item, src: value } : { ...item, repetitions: Number(value) };
    }));
    setError(null);
  };

  const restartSession = () => {
    if (queue.length === 0) return;
    const firstVideo = queue[0];
    setActiveIndex(0);
    setRemaining(firstVideo.repetitions);
    setPlayed(0);
    setLoaded(0);
    setDuration(null);
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setError(null);
    setStatus(`Reproduzindo vídeo 1 de ${queue.length}.`);
  };

  // Ponto único pra começar a tocar uma fila nova (form de vídeo único, form de
  // playlist, ou uma playlist salva) — os 3 call sites faziam esse mesmo bloco
  // de ~10 setX com pequenas variações; cada uma virou um parâmetro explícito
  // em vez de tentar inferir a diferença (repetições ≠ posição na fila,
  // vídeo único nunca reseta duration/nome da playlist).
  const startQueue = (items: VideoItem[], { playImmediately = false, playlistId, playlistName, resetDuration = true, statusMessage }: { playImmediately?: boolean; playlistId: string | null; playlistName?: string; resetDuration?: boolean; statusMessage: string }) => {
    if (items.length === 0) return;
    // Gesto do usuário: dá play na instância atual antes de trocar o estado,
    // assim o navegador mantém a ativação e não recarrega o preview.
    if (playImmediately) attemptPlay();
    if (playlistName !== undefined) setQueuePlaylistName(playlistName);
    setQueue(items);
    setActiveSavedPlaylistId(playlistId);
    setActiveIndex(0);
    setRemaining(items[0].repetitions);
    setPlayed(0);
    setLoaded(0);
    if (resetDuration) setDuration(null);
    seekingRef.current = false;
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setError(null);
    setStatus(statusMessage);
  };

  const resetQueue = () => {
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

  const stopQueue = () => {
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
    setStatus("Playlist encerrada. Escolha ou monte outra para iniciar sem pressa.");
  };

  const resumeQueue = (session: ResumableSession) => {
    setQueue(session.queue);
    setActiveSavedPlaylistId(null);
    setActiveIndex(session.activeIndex);
    setRemaining(session.remaining);
    setQueuePlaylistName(session.playlistName);
    setVolume(session.volume / 100);
    setPlaybackRate(Number.isFinite(session.playbackRate) && (session.playbackRate as number) >= 0.25 && (session.playbackRate as number) <= 4 ? session.playbackRate as number : 1);
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setStatus(`Reproduzindo vídeo ${session.activeIndex + 1} de ${session.queue.length}.`);
  };

  // Avança uma repetição do vídeo atual (manual = botão; automático = ended).
  const playNextRepetition = (manual: boolean) => {
    if (!activeVideo || activeIndex === null) return;
    if (remaining <= 1) { playNextVideo(manual); return; }
    const nextRemaining = remaining - 1;
    setRemaining(nextRemaining);
    setPlayed(0);
    setHasPlaybackStarted(false);
    try {
      programmaticSeekRef.current = true;
      const node = playerRef.current;
      if (usesNativeYoutubePlaylist) {
        sendNativeYoutubeCommand("seekTo", [0, true]);
        sendNativeYoutubeCommand("playVideo");
      } else if (node) {
        if ("currentTime" in node) node.currentTime = 0;
        const maybeSeek = (node as unknown as { seekTo?: (s: number, t?: string) => void }).seekTo;
        if (typeof maybeSeek === "function") maybeSeek.call(node, 0, "seconds");
      }
    } catch { programmaticSeekRef.current = false; /* segue para play */ }
    // O seek acima pausa alguns providers; re-dispara play no próximo tick.
    window.setTimeout(() => { attemptPlay(); }, manual ? 60 : 0);
    setIsPlaying(true);
    setStatus(`Reproduzindo ${activeVideo.repetitions - nextRemaining + 1} de ${activeVideo.repetitions}.`);
  };

  // Volta uma repetição do vídeo atual (manual = botão). Não apaga histórico:
  // só repetições assistidas até o fim são gravadas.
  const playPreviousRepetition = () => {
    if (!activeVideo || activeIndex === null) return;
    if (remaining >= activeVideo.repetitions) return;
    const nextRemaining = remaining + 1;
    setRemaining(nextRemaining);
    setPlayed(0);
    setHasPlaybackStarted(false);
    try {
      programmaticSeekRef.current = true;
      const node = playerRef.current;
      if (usesNativeYoutubePlaylist) {
        sendNativeYoutubeCommand("seekTo", [0, true]);
        sendNativeYoutubeCommand("playVideo");
      } else if (node && "currentTime" in node) node.currentTime = 0;
    } catch { programmaticSeekRef.current = false; /* segue para play */ }
    window.setTimeout(() => { attemptPlay(); }, 60);
    setIsPlaying(true);
    setStatus(`Reproduzindo ${activeVideo.repetitions - nextRemaining + 1} de ${activeVideo.repetitions}.`);
  };

  // Volta para o vídeo anterior (manual = botão, sem gravar histórico).
  const playPreviousVideo = () => {
    if (!activeVideo || activeIndex === null || activeIndex <= 0) return;
    const prevVideo = queue[activeIndex - 1];
    if (!isPlayableItem(prevVideo, canPlaySrc)) {
      setIsPlaying(false);
      setError("O vídeo anterior precisa de uma URL válida e de pelo menos uma repetição antes de continuar.");
      setStatus("Playlist pausada para revisar o vídeo anterior.");
      return;
    }
    setActiveIndex(activeIndex - 1);
    setRemaining(prevVideo.repetitions);
    setPlayed(0);
    setLoaded(0);
    setDuration(null);
    seekingRef.current = false;
    setHasPlaybackStarted(false);
    setIsPlaying(true);
    setStatus(`Reproduzindo vídeo ${activeIndex} de ${queue.length}.`);
  };

  const sendNativeYoutubeCommand = (command: "nextVideo" | "previousVideo" | "seekTo" | "playVideo", args: unknown[] = []) => {
    const player = playerRef.current as (HTMLVideoElement & { shadowRoot?: ShadowRoot | null }) | null;
    const iframe = player?.shadowRoot?.querySelector("iframe");
    if (!iframe?.contentWindow) return;
    try {
      const targetOrigin = new URL(iframe.src).origin;
      iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: command, args }), targetOrigin);
    } catch { /* o player mantém o controle nativo */ }
  };

  const nextVideo = () => {
    if (usesNativeYoutubePlaylist) sendNativeYoutubeCommand("nextVideo");
    playNextVideo(true);
  };
  const previousVideo = () => {
    if (usesNativeYoutubePlaylist) sendNativeYoutubeCommand("previousVideo");
    playPreviousVideo();
  };
  // Avança para o próximo vídeo (manual = botão, sem gravar histórico).
  const playNextVideo = (manual: boolean) => {
    if (!activeVideo || activeIndex === null) return;
    const nextIndex = activeIndex + 1;
    if (!manual) recordCompletedVideo(activeVideo);
    if (nextIndex < queue.length) {
      const nextVideo = queue[nextIndex];
      if (!isPlayableItem(nextVideo, canPlaySrc)) {
        setIsPlaying(false);
        setError("O próximo vídeo precisa de uma URL válida e de pelo menos uma repetição antes de continuar.");
        setStatus("Playlist pausada para revisar o próximo vídeo.");
        return;
      }
      setActiveIndex(nextIndex);
      setRemaining(nextVideo.repetitions);
      if (!manual && usesNativeYoutubePlaylist) {
        ignoreStaleEndedRef.current = true;
        // Se o próximo vídeo nunca começar a tocar (autoplay bloqueado, comum em
        // mobile), handlePlaybackStarted nunca libera essa flag — sem este limite
        // de tempo, todo handleEnded seguinte ficaria travado para sempre.
        window.setTimeout(() => { ignoreStaleEndedRef.current = false; }, 4000);
      }
      setPlayed(0);
      setLoaded(0);
      setDuration(null);
      seekingRef.current = false;
      setHasPlaybackStarted(false);
      setStatus(`Reproduzindo vídeo ${nextIndex + 1} de ${queue.length}.`);
      return;
    }
    setIsPlaying(false);
    setRemaining(0);
    setIsSessionComplete(true);
    setStatus("Sessão concluída. Entre para manter este histórico.");
    clearResumeSession();
  };

  const handleEnded = (videoId: string, expectedRemaining = remaining) => {
    if (ignoreStaleEndedRef.current) return;
    const endedKey = `${videoId}:${expectedRemaining}`;
    if (!activeVideo || activeIndex === null || !hasPlaybackStarted || expectedRemaining !== remaining || videoId !== activeVideoIdRef.current || endedVideoIdRef.current === endedKey) return;
    endedVideoIdRef.current = endedKey;
    if (remaining > 1) playNextRepetition(false);
    else playNextVideo(false);
  };

  const handlePlaybackError = () => {
    ignoreStaleEndedRef.current = false;
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setRemaining(0);
    setDuration(null);
    setPlayed(0);
    setLoaded(0);
    setError(playbackErrorMessage(activeVideo?.src ?? ""));
    setStatus("Reprodução interrompida: a fonte atual não pôde ser carregada.");
    clearResumeSession();
  };

  const handlePlayerReady = (videoId: string) => {
    if (!activeVideo || videoId !== activeVideoIdRef.current) return;
    playLoadedVideo();
  };

  const handlePlaybackStarted = (videoId: string) => {
    if (!activeVideo || activeIndex === null || videoId !== activeVideoIdRef.current) return;
    const mediaDuration = playerRef.current?.duration;
    if (typeof mediaDuration === "number" && Number.isFinite(mediaDuration) && mediaDuration > 0) setDuration(mediaDuration);
    ignoreStaleEndedRef.current = false;
    endedVideoIdRef.current = null;
    setPlayBlocked(false);
    setIsPlaying(true);
    setHasPlaybackStarted(true);
    setStatus(`Reproduzindo ${activeVideo.repetitions - remaining + 1} de ${activeVideo.repetitions}.`);
  };

  const handleActiveTimeUpdate = (videoId: string) => {
    const node = playerRef.current;
    if (!activeVideo || activeIndex === null || videoId !== activeVideoIdRef.current || !node || error) return;
    handleTimeUpdate();
    const mediaDuration = node.duration;
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
      setDuration(mediaDuration);
      setVideoDurations((current) => current[activeVideo.id] === mediaDuration ? current : { ...current, [activeVideo.id]: mediaDuration });
    }
    if (isMediaActuallyPlaying(node)) {
      if (!hasPlaybackStarted) handlePlaybackStarted(videoId);
      if (playBlocked) setPlayBlocked(false);
    }
  };

  // onPlay/onStart do v3 disparam no evento `play` (antes de ter dados).
  // onPlaying só dispara quando há dados fluindo — se depender só dele,
  // YouTube em buffering ou autoplay bloqueado trava em "Iniciando…".
  const handlePlaybackPlay = (videoId: string) => {
    if (!activeVideo || activeIndex === null || videoId !== activeVideoIdRef.current) return;
    const media = playerRef.current;
    const nativePlaylistAdvanced = usesNativeYoutubePlaylist
      && hasPlaybackStarted
      && remaining === 1
      && isPlaying
      && media
      && Number.isFinite(media.currentTime)
      && played > 0.9
      && media.currentTime < 0.5;
    if (nativePlaylistAdvanced) {
      playNextVideo(false);
      return;
    }
    endedVideoIdRef.current = null;
    setPlayBlocked(false);
    setIsPlaying(true);
    // Marca started já no `play` para sair do "Iniciando…" mesmo em buffering.
    setHasPlaybackStarted((started) => {
      if (!started) setStatus(`Reproduzindo ${activeVideo.repetitions - remaining + 1} de ${activeVideo.repetitions}.`);
      return true;
    });
  };

  const togglePlay = () => {
    // Gesto do usuário: tenta play imperativo primeiro (preserva ativação),
    // depois espelha no estado declarativo que o Player.js observa.
    if (!isPlaying) attemptPlay();
    else {
      try { playerRef.current?.pause(); } catch { /* segue para estado */ }
    }
    setIsPlaying((value) => !value);
  };

  const toggleMute = () => setVolume((value) => (value === 0 ? 0.7 : 0));

  const retryCurrentVideo = () => {
    if (!activeVideo) return;
    endedVideoIdRef.current = null;
    setError(null);
    setHasPlaybackStarted(false);
    setIsPlaying(true);
    setStatus("Tentando carregar este vídeo novamente…");
  };

  const handlePlaybackPause = (videoId: string) => {
    if (!activeVideo || !hasPlaybackStarted || videoId !== activeVideoIdRef.current || endedVideoIdRef.current === `${videoId}:${remaining}`) return;
    // Mídia nativa (HTML5 audio/video) dispara `pause` um instante antes de `ended`
    // ao terminar sozinha. Tratar isso como pausa real zera hasPlaybackStarted bem
    // na hora em que handleEnded (e o watchdog de fim estimado) mais precisam dele
    // ligado — o resultado observado foi o player entrar num loop de play/pause e
    // reiniciar a mídia do zero (play() numa mídia `ended` volta pro início) sem
    // nunca decrementar a repetição.
    if (hasMediaReachedEnd(playerRef.current)) return;
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setStatus("Reprodução pausada.");
  };

  const handleDurationChange = (nextDuration: number) => {
    setDuration(nextDuration);
    if (activeVideo && Number.isFinite(nextDuration) && nextDuration > 0) {
      setVideoDurations((current) => current[activeVideo.id] === nextDuration ? current : { ...current, [activeVideo.id]: nextDuration });
    }
  };

  useEffect(() => {
    onPlaybackChange?.({
      duration,
      hasSession: Boolean(activeVideo && activeIndex !== null && !isSessionComplete),
      hasNextVideo,
      hasPrevVideo,
      isPlaying,
      played,
      remaining,
      source: activeVideo?.src ?? null,
      totalRepetitions,
      volume,
    });
  }, [activeIndex, activeVideo, duration, hasNextVideo, hasPrevVideo, isPlaying, isSessionComplete, onPlaybackChange, played, remaining, totalRepetitions, volume]);

  return {
    activeIndex,
    activeSavedPlaylistId,
    activeVideo,
    canGoBackRepetition,
    canSkipRepetition,
    completedQueue,
    completedRepetitions,
    handleActiveTimeUpdate,
    handleDurationChange,
    handleEnded,
    handlePlaybackError,
    handlePlaybackPause,
    handlePlaybackPlay,
    handlePlaybackStarted,
    handlePlayerReady,
    hasNextVideo,
    hasPlaybackStarted,
    hasPrevVideo,
    isPlaying,
    isSessionComplete,
    nextVideo,
    playBlocked,
    playNextRepetition,
    playNextVideo,
    playPreviousRepetition,
    playPreviousVideo,
    previousVideo,
    queue,
    queuePlaylistName,
    remaining,
    removeFutureItem,
    resetQueue,
    restartSession,
    resumeQueue,
    retryCurrentVideo,
    startQueue,
    stopQueue,
    setActiveSavedPlaylistId,
    setIsPlaying,
    setQueuePlaylistName,
    toggleMute,
    togglePlay,
    totalRepetitions,
    updateUpcomingItem,
    usesNativeYoutubePlaylist,
    videoDurations,
    visibleQueue,
    youtubePlaylistSources,
  };
}
