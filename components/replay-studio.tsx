"use client";

import { forwardRef, type FormEvent, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { RotateCcw, Save, Trash2, X } from "lucide-react";

import { PlaybackQueue } from "@/components/playback-queue";
import { ReplayComposer } from "@/components/replay-composer";
import { ReplayPlayerSurface } from "@/components/replay-player-surface";
import { canPlaySrc } from "@/components/react-player-client";
import { authClient } from "@/lib/auth-client";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { playbackErrorMessage } from "@/lib/playback-error";
import { type PlaylistDraft, type ResumableSession, type SavedPlaylist, type VideoItem, isPlayableItem, makeDraft, makeItem, parseFirstPlaylistLine, parsePlaylistDrafts, parsePlaylistLine, parsePlaylistLines, parseSingleReplay } from "@/lib/replay-playlist";
import { getPlaybackSnapshot, getPlayerStatus } from "@/lib/replay-session";
import { usePlayerMedia } from "@/hooks/use-player-media";

export type ReplayStudioHandle = {
  nextVideo: () => void;
  seekBy: (seconds: number) => void;
  selectMode: (mode: "single" | "playlist") => void;
  toggleMute: () => void;
  togglePlayback: () => void;
};

export type PlaybackSnapshot = {
  duration: number | null;
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
  const [mode, setMode] = useState(initialMode);
  const [source, setSource] = useState("");
  const [repetitions, setRepetitions] = useState("3");
  const [playlistInputMode, setPlaylistInputMode] = useState<"simple" | "advanced">("advanced");
  const [simplePlaylist, setSimplePlaylist] = useState("");
  const [drafts, setDrafts] = useState<PlaylistDraft[]>([{ id: "playlist-draft-0", src: "", repetitions: "1" }]);
  const [playlistName, setPlaylistName] = useState("Minha playlist");
  const [playlistSaveMessage, setPlaylistSaveMessage] = useState<string | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [queuePlaylistName, setQueuePlaylistName] = useState("Minha playlist");
  const [queueSaveMessage, setQueueSaveMessage] = useState<string | null>(null);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [isSavingQueue, setIsSavingQueue] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<"draft" | "queue">("draft");
  const [saveName, setSaveName] = useState("Minha playlist");
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [draftPlaylistId, setDraftPlaylistId] = useState<string | null>(null);
  const [activeSavedPlaylistId, setActiveSavedPlaylistId] = useState<string | null>(null);
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Pronto para uma nova sessão.");
  const [videoMetadata, setVideoMetadata] = useState<{ authorName: string | null; title: string | null }>({ authorName: null, title: null });
  const [queueMetadata, setQueueMetadata] = useState<Record<string, { authorName: string | null; title: string | null; loading: boolean }>>({});
  const [resumeSession, setResumeSession] = useState<ResumableSession | null>(null);
  const [isDiscardResumeOpen, setIsDiscardResumeOpen] = useState(false);
  const activeVideoIdRef = useRef<string | null>(null);
  const endedVideoIdRef = useRef<string | null>(null);
  const ignoreStaleEndedRef = useRef(false);
  const scheduledEndRef = useRef<number | null>(null);
  const { attemptPlay, duration, goFullscreen, handleProgress, handleRateChange, handleSeeked, handleSeekSliderChange, handleSeekSliderDown, handleSeekSliderUp, handleTimeUpdate, loaded, pip, played, playbackRate, playerRef, programmaticSeekRef, seekingRef, seekBy, setDuration, setLoaded, setPip, setPlaybackRate, setPlayed, setVolume, volume } = usePlayerMedia();

  const { activeVideo, completedQueue, completedRepetitions, hasNextVideo, hasPrevVideo, totalRepetitions, visibleQueue } = getPlaybackSnapshot(queue, activeIndex, remaining);
  activeVideoIdRef.current = activeVideo?.id ?? null;
  const singleReplay = useMemo(() => parseSingleReplay(source, repetitions, canPlaySrc), [repetitions, source]);
  const canSubmitSingle = singleReplay !== null;
  const playlistItems = useMemo(() => parsePlaylistDrafts(drafts, canPlaySrc), [drafts]);
  const simplePlaylistItems = useMemo(() => parsePlaylistLines(simplePlaylist, canPlaySrc), [simplePlaylist]);
  const firstSimplePlaylistItem = useMemo(() => parseFirstPlaylistLine(simplePlaylist, canPlaySrc), [simplePlaylist]);
  const youtubePlaylistSources = useMemo(() => {
    if (activeVideo) return queue.map((item) => item.src);
    if (mode !== "playlist") return [];
    const entries = playlistInputMode === "simple" ? simplePlaylistItems : playlistItems;
    return entries?.map((item) => item.src) ?? [];
  }, [activeVideo, mode, playlistInputMode, playlistItems, queue, simplePlaylistItems]);
  const usesNativeYoutubePlaylist = youtubePlaylistSources.length > 1;
  const canSubmitPlaylist = playlistInputMode === "simple"
    ? simplePlaylistItems !== null
    : playlistItems !== null;
  // Motivo do Iniciar desabilitado — botão cinza sem explicação é beco sem saída.
  const singleHint = !canSubmitSingle
    ? !source.trim()
      ? "Cole a URL do vídeo para liberar o início."
      : !isPlayableMediaUrl(source.trim()) || !canPlaySrc(source.trim())
        ? "Essa URL não é reproduzível aqui — use YouTube, Vimeo ou arquivo direto."
        : "Repetições: número inteiro maior que zero."
    : null;
  const firstBadDraft = playlistInputMode === "advanced"
    ? drafts.findIndex((draft) => !parseSingleReplay(draft.src, draft.repetitions, canPlaySrc))
    : -1;
  const playlistHint = !canSubmitPlaylist
    ? playlistInputMode === "simple"
      ? "Revise as linhas: cada uma precisa de link;quantidade válidos."
      : firstBadDraft >= 0
        ? `Revise o vídeo ${firstBadDraft + 1}: URL ou repetições inválidas.`
        : "Revise os vídeos da playlist."
    : null;
  const simplePlaylistLineCount = simplePlaylist.split("\n").filter((line) => line.trim()).length;
  const invalidSimpleLine = playlistInputMode === "simple"
    ? simplePlaylist.split("\n").findIndex((line) => {
      const value = line.trim();
      if (!value) return false;
      return !parsePlaylistLine(value, canPlaySrc);
    })
    : -1;
  const isEditingQueue = mode === "playlist" && activeIndex !== null && queue.length > 0;
  const progressLabel = activeIndex === null || error || !hasPlaybackStarted ? null : `Vídeo ${activeIndex + 1} de ${queue.length} · ${completedRepetitions} de ${totalRepetitions} repetições concluídas`;
  const isLoggedIn = Boolean(session.data?.user);
  const canSkipRepetition = activeVideo !== null && (remaining > 1 || hasNextVideo);
  const canGoBackRepetition = activeVideo !== null && activeIndex !== null && remaining < activeVideo.repetitions;
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
  const playerStatus = getPlayerStatus({ previewVideo, activeVideo, isPlaying, hasPlaybackStarted, playBlocked, error, fallbackStatus: status, remaining });

  useEffect(() => {
    const src = activeVideo?.src ?? previewVideo?.src;
    if (!src || !/youtube(?:-nocookie)?\.com|youtu\.be/.test(src)) {
      setVideoMetadata({ authorName: null, title: null });
      return;
    }
    const controller = new AbortController();
    void fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(src)}&format=json`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ author_name?: string; title?: string }> : null)
      .then((result) => {
        if (result) setVideoMetadata({ authorName: result.author_name ?? null, title: result.title ?? null });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [activeVideo?.src, previewVideo?.src]);

  useEffect(() => {
    const sources = Array.from(new Set(queue.map((item) => item.src).filter((src) => /youtube(?:-nocookie)?\.com|youtu\.be/.test(src))));
    if (sources.length === 0) { setQueueMetadata({}); return; }
    const controller = new AbortController();
    setQueueMetadata((current) => Object.fromEntries(sources.map((src) => [src, { authorName: current[src]?.authorName ?? null, title: current[src]?.title ?? null, loading: true }])));
    void Promise.all(sources.map(async (src) => {
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(src)}&format=json`, { signal: controller.signal });
        if (!response.ok) return [src, { authorName: null, title: null, loading: false }] as const;
        const result = await response.json() as { author_name?: string; title?: string };
        return [src, { authorName: result.author_name ?? null, title: result.title ?? null, loading: false }] as const;
      } catch { return [src, { authorName: null, title: null, loading: false }] as const; }
    })).then((entries) => setQueueMetadata(Object.fromEntries(entries))).catch(() => undefined);
    return () => controller.abort();
  }, [queue]);

  useEffect(() => {
    if (mode !== "playlist") return;
    void fetch("/api/playlists").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { playlists: SavedPlaylist[] };
      setSavedPlaylists(result.playlists);
    }).catch(() => undefined);
  }, [mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const replaySource = params.get("source");
    const replayRepetitions = Number(params.get("repetitions"));
    if (!replaySource || !isPlayableMediaUrl(replaySource) || !Number.isInteger(replayRepetitions) || replayRepetitions < 1) return;
    setMode("single");
    setSource(replaySource);
    setRepetitions(String(replayRepetitions));
    setStatus("Vídeo carregado do histórico. Inicie quando quiser.");
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!session.data?.user) return;
    void fetch("/api/playback-session").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { session: ResumableSession | null };
      setResumeSession(result.session);
    }).catch(() => undefined);
  }, [session.data?.user]);

  useEffect(() => {
    if (!isSaveDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSaveDialogOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSaveDialogOpen]);

  useEffect(() => {
    if (!session.data?.user || !isPlaying || !hasPlaybackStarted || activeIndex === null || queue.length === 0 || !activeVideo || error) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/playback-session", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queue, activeIndex, remaining, playlistName: queuePlaylistName.trim() || "Minha playlist", volume: Math.round(volume * 100), playbackRate }),
      });
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, activeVideo, error, hasPlaybackStarted, isPlaying, playbackRate, queue, queuePlaylistName, remaining, session.data?.user, volume]);

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
      if (event.key.toLowerCase() === "n" && activeIndex !== null) playNextVideo(true);
      if (event.key.toLowerCase() === "b" && activeIndex !== null) playPreviousVideo();
      if (event.key.toLowerCase() === "j") seekBy(-10);
      if (event.key.toLowerCase() === "l") seekBy(10);
      if (event.key === "ArrowUp") { event.preventDefault(); setVolume((value) => Math.min(1, Number((value + 0.05).toFixed(2)))); }
      if (event.key === "ArrowDown") { event.preventDefault(); setVolume((value) => Math.max(0, Number((value - 0.05).toFixed(2)))); }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeVideo, activeIndex, remaining]);

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
          if (remaining > 1) playNextRepetition(false);
          else playNextVideo(false);
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
    setPlayBlocked(false);
    attemptPlay();
    const interval = window.setInterval(() => {
      try {
        const node = playerRef.current;
        if (!node) return;
        if ((node as HTMLVideoElement).paused) {
          const r = (node as HTMLVideoElement).play() as unknown as Promise<void> | undefined;
          if (r && typeof r.catch === "function") r.catch(() => undefined);
        }
      } catch { /* tenta no próximo tick */ }
    }, 600);
    const timeout = window.setTimeout(() => setPlayBlocked(true), 8000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [activeVideo?.id, isPlaying, hasPlaybackStarted, error]);

  useEffect(() => {
    if (scheduledEndRef.current !== null) window.clearTimeout(scheduledEndRef.current);
    scheduledEndRef.current = null;
    if (!activeVideo || !isPlaying || !hasPlaybackStarted || error || duration === null || duration <= 0 || (remaining <= 1 && !hasNextVideo)) return;
    const remainingTime = Math.max(0, duration * (1 - played) - 0.25);
    scheduledEndRef.current = window.setTimeout(() => {
      scheduledEndRef.current = null;
      handleEnded(activeVideo.id);
    }, remainingTime * 1000);
    return () => {
      if (scheduledEndRef.current !== null) window.clearTimeout(scheduledEndRef.current);
      scheduledEndRef.current = null;
    };
  }, [activeVideo?.id, duration, error, hasNextVideo, hasPlaybackStarted, isPlaying, played, remaining]);

  const updateDraft = (id: string, field: "src" | "repetitions", value: string) => {
    setDraftPlaylistId(null);
    setDrafts((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setError(null);
  };

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
    setStatus("Pronto para montar uma nova playlist.");
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
    setStatus("Playlist encerrada. Escolha ou monte outra para iniciar.");
    setResumeSession(null);
    if (session.data?.user) void fetch("/api/playback-session", { method: "DELETE" });
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

  const playLoadedVideo = attemptPlay;

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

  const discardResume = () => {
    setResumeSession(null);
    setIsDiscardResumeOpen(false);
    void fetch("/api/playback-session", { method: "DELETE" });
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

  const savePlaylist = async () => {
    const isQueue = saveTarget === "queue";
    const draftEntries = playlistInputMode === "simple" ? simplePlaylistItems : playlistItems;
    const entries = isQueue
      ? queue.map((item) => ({ url: item.src.trim(), repetitions: item.repetitions }))
      : draftEntries?.map((item) => ({ url: item.src.trim(), repetitions: item.count }));
    if (!isLoggedIn || !saveName.trim() || !entries?.length || !entries.every((item) => isPlayableMediaUrl(item.url) && canPlaySrc(item.url) && Number.isInteger(item.repetitions) && item.repetitions > 0)) {
      setSaveDialogError("Informe um nome e revise os links e repetições antes de salvar.");
      return;
    }

    if (isQueue) setIsSavingQueue(true); else setIsSavingPlaylist(true);
    if (isQueue) setQueueSaveMessage(null); else setPlaylistSaveMessage(null);
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: saveName.trim(), items: entries }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setSaveDialogError(result?.error ?? "Não foi possível salvar a playlist agora.");
        return;
      }
      setSavedPlaylists((items) => [result.playlist as SavedPlaylist, ...items.filter((item) => item.id !== result.playlist.id)]);
      if (isQueue) {
        setQueuePlaylistName(saveName.trim());
        setActiveSavedPlaylistId(result.playlist.id);
        setQueueSaveMessage("Playlist salva na sua conta.");
      } else {
        setPlaylistName(saveName.trim());
        setDraftPlaylistId(result.playlist.id);
        setPlaylistSaveMessage("Playlist salva na sua conta.");
      }
      setIsSaveDialogOpen(false);
    } catch {
      setSaveDialogError("Não foi possível salvar a playlist agora. Tente novamente.");
    } finally {
      if (isQueue) setIsSavingQueue(false); else setIsSavingPlaylist(false);
    }
  };

  const recordCompletedVideo = (item: VideoItem, attempt = 0) => {
    // Fire-and-forget com retry: sem isso, uma falha de rede pontual
    // apaga a repetição do histórico para sempre.
    const send = () => recordCompletedVideo(item, attempt + 1);
    void fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: item.src, completedRepetitions: item.repetitions }),
    }).then((response) => {
      if (!response.ok && attempt < 2) window.setTimeout(send, 1500 * (attempt + 1));
    }).catch(() => {
      if (attempt < 2) window.setTimeout(send, 1500 * (attempt + 1));
    });
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
(0);
(0);
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
(0);
(0);
    seekingRef.current = false;
    setIsPlaying(true);
    setHasPlaybackStarted(false);
    setIsSessionComplete(false);
    setError(null);
    setStatus(`Reproduzindo vídeo 1 de ${nextQueue.length}.`);
    setDuration(null);
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
      if (!manual && usesNativeYoutubePlaylist) ignoreStaleEndedRef.current = true;
      setPlayed(0);
      setLoaded(0);
      setDuration(null);
      seekingRef.current = false;
      setHasPlaybackStarted(false);
      setStatus(`Reproduzindo vídeo ${nextIndex + 1} de ${queue.length}.`);
      return;
    }
    setIsPlaying(false);
    setIsSessionComplete(true);
    setStatus("Sessão concluída. Entre para manter este histórico.");
    setResumeSession(null);
    if (session.data?.user) void fetch("/api/playback-session", { method: "DELETE" });
  };

  const handleEnded = (videoId: string) => {
    if (ignoreStaleEndedRef.current) return;
    if (!activeVideo || activeIndex === null || !hasPlaybackStarted || videoId !== activeVideoIdRef.current || endedVideoIdRef.current === videoId) return;
    endedVideoIdRef.current = videoId;
    if (remaining > 1) playNextRepetition(false);
    else playNextVideo(false);
  };

  const handlePlaybackError = () => {
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setRemaining(0);
    setDuration(null);
(0);
(0);
    setError(playbackErrorMessage(activeVideo?.src ?? ""));
    setStatus("Reprodução interrompida: a fonte atual não pôde ser carregada.");
    setResumeSession(null);
    if (session.data?.user) void fetch("/api/playback-session", { method: "DELETE" });
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
    setIsPlaying(true);
    setHasPlaybackStarted(true);
    setStatus(`Reproduzindo ${activeVideo.repetitions - remaining + 1} de ${activeVideo.repetitions}.`);
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
      && media.currentTime < 0.5;
    if (nativePlaylistAdvanced) {
      playNextVideo(false);
      return;
    }
    endedVideoIdRef.current = null;
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
    if (!activeVideo || !hasPlaybackStarted || videoId !== activeVideoIdRef.current || endedVideoIdRef.current === videoId) return;
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setStatus("Reprodução pausada.");
  };

  useEffect(() => {
    onPlaybackChange?.({
      duration,
      hasNextVideo,
      hasPrevVideo,
      isPlaying,
      played,
      remaining,
      source: activeVideo?.src ?? null,
      totalRepetitions,
      volume,
    });
  }, [activeVideo?.src, duration, hasNextVideo, hasPrevVideo, isPlaying, onPlaybackChange, played, remaining, totalRepetitions, volume]);

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
            onDurationChange={(nextDuration) => {
              setDuration(nextDuration);
              if (activeVideo && Number.isFinite(nextDuration) && nextDuration > 0) {
                setVideoDurations((current) => current[activeVideo.id] === nextDuration ? current : { ...current, [activeVideo.id]: nextDuration });
              }
            }}
            onEnterPictureInPicture={() => setPip(true)}
            onLeavePictureInPicture={() => setPip(false)}
            onNextRepetition={() => playNextRepetition(true)}
            onNextVideo={() => playNextVideo(true)}
            onPause={handlePlaybackPause}
            onPlaybackError={handlePlaybackError}
            onPlaybackPlay={handlePlaybackPlay}
            onPlaybackStarted={handlePlaybackStarted}
            onPlayerReady={handlePlayerReady}
            onPreviewError={() => setError(playbackErrorMessage(previewVideo?.src ?? source))}
            onPreviousRepetition={playPreviousRepetition}
            onPreviousVideo={playPreviousVideo}
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
            onTimeUpdate={handleTimeUpdate}
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

        {mode === "playlist" && queue.length > 0 && <PlaybackQueue activeIndex={activeIndex} completedQueue={completedQueue} error={error} hasPlaybackStarted={hasPlaybackStarted} isLoggedIn={isLoggedIn} isPlaying={isPlaying} isSavedPlaylist={activeSavedPlaylistId !== null} isSaving={isSavingQueue} metadata={queueMetadata} onRemoveFutureItem={removeFutureItem} onSave={() => openSaveDialog("queue")} onStop={stopPlaylist} onUpdateUpcomingItem={updateUpcomingItem} queue={queue} remaining={remaining} saveMessage={queueSaveMessage} visibleQueue={visibleQueue} />}
      </section>
      {isDiscardResumeOpen && <div className="confirm-backdrop" role="presentation"><section aria-labelledby="discard-resume-title" aria-modal="true" className="confirm-dialog" role="alertdialog"><h2 id="discard-resume-title">Descartar retomada?</h2><p>O ponto salvo desta playlist será removido.</p><div><button className="secondary-button" onClick={() => setIsDiscardResumeOpen(false)} type="button">Cancelar</button><button className="danger-button" onClick={discardResume} type="button">Descartar</button></div></section></div>}
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
