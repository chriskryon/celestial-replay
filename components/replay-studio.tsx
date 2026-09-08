"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Keyboard, ListMusic, ListPlus, Maximize, Orbit, Pause, PictureInPicture2, Play, Plus, RotateCcw, Save, SkipBack, SkipForward, StepBack, StepForward, Trash2, Video, Volume2, VolumeX, X } from "lucide-react";
import screenfull from "screenfull";

import { AuthControls } from "@/components/auth-controls";
import { AccountStudioTabs } from "@/components/account-studio-tabs";
import { canEnablePIP, canPlaySrc } from "@/components/react-player-client";
import { authClient } from "@/lib/auth-client";
import { isPlayableMediaUrl } from "@/lib/media-url";

const ReactPlayer = dynamic(() => import("@/components/react-player-client"), { ssr: false });

type VideoItem = { id: string; src: string; repetitions: number };
type PlaylistDraft = { id: string; src: string; repetitions: string };
type ParsedPlaylistItem = { src: string; count: number };
type SavedPlaylist = { id: string; name: string; items: Array<{ id: string; url: string; repetitions: number }> };
type ResumableSession = { queue: VideoItem[]; activeIndex: number; remaining: number; playlistName: string; volume: number; playbackRate?: number };

const makeItem = (src: string, repetitions: number): VideoItem => ({ id: crypto.randomUUID(), src, repetitions });
const makeDraft = (): PlaylistDraft => ({ id: crypto.randomUUID(), src: "", repetitions: "1" });

const isPlayableItem = (item: VideoItem) => isPlayableMediaUrl(item.src.trim()) && canPlaySrc(item.src.trim()) && Number.isInteger(item.repetitions) && item.repetitions > 0;

function parsePlaylistLines(value: string): ParsedPlaylistItem[] | null {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const parsed = lines.map((line) => {
    const [src, repetitions, ...extra] = line.split(";").map((part) => part.trim());
    const count = Number(repetitions);
    return extra.length === 0 && isPlayableMediaUrl(src) && canPlaySrc(src) && Number.isInteger(count) && count > 0 ? { src, count } : null;
  });
  return parsed.every(Boolean) ? parsed as ParsedPlaylistItem[] : null;
}

function parseFirstPlaylistLine(value: string): ParsedPlaylistItem | null {
  const line = value.split("\n").map((item) => item.trim()).find(Boolean);
  if (!line) return null;
  const [src, repetitions, ...extra] = line.split(";").map((part) => part.trim());
  const count = Number(repetitions);
  return extra.length === 0 && isPlayableMediaUrl(src) && canPlaySrc(src) && Number.isInteger(count) && count > 0 ? { src, count } : null;
}

export function ReplayStudio({ initialMode = "single" }: { initialMode?: "single" | "playlist" }) {
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
  const [isSavingQueue, setIsSavingQueue] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<"draft" | "queue">("draft");
  const [saveName, setSaveName] = useState("Minha playlist");
  const [saveDialogError, setSaveDialogError] = useState<string | null>(null);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pip, setPip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Pronto para uma nova sessão.");
  const [resumeSession, setResumeSession] = useState<ResumableSession | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const seekingRef = useRef(false);
  const programmaticSeekRef = useRef(false);
  const activeVideoIdRef = useRef<string | null>(null);
  const endedVideoIdRef = useRef<string | null>(null);
  // Ref do elemento de mídia interno do ReactPlayer v3 (HTMLMediaElement).
  // playerRef.current.play() / .pause() / .seekTo via currentTime.
  const playerRef = useRef<HTMLVideoElement | null>(null);

  const activeVideo = activeIndex === null ? null : queue[activeIndex] ?? null;
  activeVideoIdRef.current = activeVideo?.id ?? null;
  const parsedRepetitions = Number(repetitions);
  const canSubmitSingle = isPlayableMediaUrl(source.trim()) && canPlaySrc(source.trim()) && Number.isInteger(parsedRepetitions) && parsedRepetitions > 0;
  const playlistItems = useMemo(() => drafts.map((draft) => ({ ...draft, count: Number(draft.repetitions) })), [drafts]);
  const simplePlaylistItems = useMemo(() => parsePlaylistLines(simplePlaylist), [simplePlaylist]);
  const firstSimplePlaylistItem = useMemo(() => parseFirstPlaylistLine(simplePlaylist), [simplePlaylist]);
  const canSubmitPlaylist = playlistInputMode === "simple"
    ? simplePlaylistItems !== null
    : playlistItems.length > 0 && playlistItems.every((item) => isPlayableMediaUrl(item.src.trim()) && canPlaySrc(item.src.trim()) && Number.isInteger(item.count) && item.count > 0);
  // Motivo do Iniciar desabilitado — botão cinza sem explicação é beco sem saída.
  const singleHint = !canSubmitSingle
    ? !source.trim()
      ? "Cole a URL do vídeo para liberar o início."
      : !isPlayableMediaUrl(source.trim()) || !canPlaySrc(source.trim())
        ? "Essa URL não é reproduzível aqui — use YouTube, Vimeo ou arquivo direto."
        : "Repetições: número inteiro maior que zero."
    : null;
  const firstBadDraft = playlistInputMode === "advanced"
    ? playlistItems.findIndex((item) => !(isPlayableMediaUrl(item.src.trim()) && canPlaySrc(item.src.trim()) && Number.isInteger(item.count) && item.count > 0))
    : -1;
  const playlistHint = !canSubmitPlaylist
    ? playlistInputMode === "simple"
      ? "Revise as linhas: cada uma precisa de link;quantidade válidos."
      : firstBadDraft >= 0
        ? `Revise o vídeo ${firstBadDraft + 1}: URL ou repetições inválidas.`
        : "Revise os vídeos da playlist."
    : null;
  const isEditingQueue = mode === "playlist" && activeIndex !== null && queue.length > 0;
  const totalRepetitions = queue.reduce((total, item) => total + item.repetitions, 0);
  const completedRepetitions = activeIndex === null ? 0 : queue.slice(0, activeIndex).reduce((total, item) => total + item.repetitions, 0) + Math.max(0, (activeVideo?.repetitions ?? 0) - remaining);
  const progressLabel = activeIndex === null || error || !hasPlaybackStarted ? null : `Vídeo ${activeIndex + 1} de ${queue.length} · ${completedRepetitions} de ${totalRepetitions} repetições concluídas`;
  const isLoggedIn = Boolean(session.data?.user);
  const hasNextVideo = activeIndex !== null && activeIndex + 1 < queue.length;
  const hasPrevVideo = activeIndex !== null && activeIndex > 0;
  const canSkipRepetition = activeVideo !== null && (remaining > 1 || hasNextVideo);
  const canGoBackRepetition = activeVideo !== null && activeIndex !== null && remaining < activeVideo.repetitions;
  const previewVideo = useMemo<VideoItem | null>(() => {
    if (activeVideo) return null;
    if (mode === "single" && canSubmitSingle) return { id: "single-preview", src: source.trim(), repetitions: parsedRepetitions };
    if (mode !== "playlist") return null;
    if (playlistInputMode === "simple" && firstSimplePlaylistItem) return { id: "simple-playlist-preview", src: firstSimplePlaylistItem.src, repetitions: firstSimplePlaylistItem.count };
    const firstDraft = playlistItems[0];
    return firstDraft && isPlayableMediaUrl(firstDraft.src.trim()) && canPlaySrc(firstDraft.src.trim()) && Number.isInteger(firstDraft.count) && firstDraft.count > 0
      ? { id: "advanced-playlist-preview", src: firstDraft.src.trim(), repetitions: firstDraft.count }
      : null;
  }, [activeVideo, canSubmitSingle, firstSimplePlaylistItem, mode, parsedRepetitions, playlistInputMode, playlistItems, source]);
  const displayedVideo = activeVideo ?? previewVideo;
  const playerStatus = previewVideo && !error
    ? "Vídeo carregado. Clique em Iniciar para começar."
    : activeVideo && isPlaying && !hasPlaybackStarted && !error
      ? playBlocked
        ? "O navegador bloqueou o início automático. Clique em Continuar."
        : "Iniciando reprodução…"
      : activeVideo && isPlaying && !error
        ? `Reproduzindo ${activeVideo.repetitions - remaining + 1} de ${activeVideo.repetitions}.`
        : activeVideo && !error
          ? "Reprodução pausada."
          : status;

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

  const updateDraft = (id: string, field: "src" | "repetitions", value: string) => {
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
    setQueue([]);
    setActiveIndex(null);
    setRemaining(0);
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setError(null);
    setStatus("Pronto para montar uma nova playlist.");
  };

  const attemptPlay = () => {
    // Chamado DENTRO de gesto do usuário (submit / Continuar) e no onReady
    // como fallback. No v3 o ref é o elemento de mídia real.
    try {
      const node = playerRef.current as (HTMLVideoElement & {
        playVideo?: () => void;
        getInternalPlayer?: () => any;
      }) | null;
      if (!node) return false;
      if (typeof node.playVideo === "function") { node.playVideo(); return true; }
      if (typeof node.play === "function") {
        const r = node.play() as unknown as Promise<void> | undefined;
        if (r && typeof r.catch === "function") r.catch(() => undefined);
        return true;
      }
      const inner = node.getInternalPlayer?.();
      if (inner && typeof inner.playVideo === "function") { inner.playVideo(); return true; }
      if (inner && typeof inner.play === "function") {
        const r = inner.play();
        if (r && typeof r.catch === "function") r.catch(() => undefined);
        return true;
      }
    } catch { /* autoplay bloqueado: o prop playing=true assume em seguida */ }
    return false;
  };

  const playLoadedVideo = attemptPlay;

  const resume = () => {
    if (!resumeSession) return;
    setMode("playlist");
    setQueue(resumeSession.queue);
    setActiveIndex(resumeSession.activeIndex);
    setRemaining(resumeSession.remaining);
    setQueuePlaylistName(resumeSession.playlistName);
    setVolume(resumeSession.volume / 100);
    setPlaybackRate(Number.isFinite(resumeSession.playbackRate) && (resumeSession.playbackRate as number) >= 0.25 && (resumeSession.playbackRate as number) <= 4 ? resumeSession.playbackRate as number : 1);
    setIsPlaying(true);
    setHasPlaybackStarted(false);
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
        setQueueSaveMessage("Playlist salva na sua conta.");
      } else {
        setPlaylistName(saveName.trim());
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
      const item = makeItem(source.trim(), parsedRepetitions);
      setQueue([item]);
      setActiveIndex(0);
      setRemaining(item.repetitions);(0);
(0);
      seekingRef.current = false;
      setIsPlaying(true);
      setHasPlaybackStarted(false);
      setError(null);
      setStatus(`Reproduzindo 1 de ${item.repetitions}.`);
      return;
    }

    if (!canSubmitPlaylist) {
      setError("Revise cada linha: todas precisam ter uma URL válida e pelo menos uma repetição.");
      return;
    }
    const entries = playlistInputMode === "simple" ? simplePlaylistItems! : playlistItems;
    // Mesmo raciocínio da playlist: o preview do 1º vídeo já está montado.
    playLoadedVideo();
    const nextQueue = entries.map((item) => makeItem(item.src.trim(), item.count));
    setQueuePlaylistName(playlistName.trim() || "Minha playlist");
    setQueue(nextQueue);
    setActiveIndex(0);
    setRemaining(nextQueue[0].repetitions);(0);
(0);
    seekingRef.current = false;
    setIsPlaying(true);
    setHasPlaybackStarted(false);
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
    setHasPlaybackStarted(false);
    try {
      programmaticSeekRef.current = true;
      const node = playerRef.current;
      if (node) {
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
    setHasPlaybackStarted(false);
    try {
      programmaticSeekRef.current = true;
      const node = playerRef.current;
      if (node && "currentTime" in node) node.currentTime = 0;
    } catch { programmaticSeekRef.current = false; /* segue para play */ }
    window.setTimeout(() => { attemptPlay(); }, 60);
    setIsPlaying(true);
    setStatus(`Reproduzindo ${activeVideo.repetitions - nextRemaining + 1} de ${activeVideo.repetitions}.`);
  };

  // Volta para o vídeo anterior (manual = botão, sem gravar histórico).
  const playPreviousVideo = () => {
    if (!activeVideo || activeIndex === null || activeIndex <= 0) return;
    const prevVideo = queue[activeIndex - 1];
    if (!isPlayableItem(prevVideo)) {
      setIsPlaying(false);
      setError("O vídeo anterior precisa de uma URL válida e de pelo menos uma repetição antes de continuar.");
      setStatus("Playlist pausada para revisar o vídeo anterior.");
      return;
    }
    setActiveIndex(activeIndex - 1);
    setRemaining(prevVideo.repetitions);
    setPlayed(0);
    setLoaded(0);
    seekingRef.current = false;
    setHasPlaybackStarted(false);
    setIsPlaying(true);
    setStatus(`Reproduzindo vídeo ${activeIndex} de ${queue.length}.`);
  };
  // Avança para o próximo vídeo (manual = botão, sem gravar histórico).
  const playNextVideo = (manual: boolean) => {
    if (!activeVideo || activeIndex === null) return;
    const nextIndex = activeIndex + 1;
    if (!manual) recordCompletedVideo(activeVideo);
    if (nextIndex < queue.length) {
      const nextVideo = queue[nextIndex];
      if (!isPlayableItem(nextVideo)) {
        setIsPlaying(false);
        setError("O próximo vídeo precisa de uma URL válida e de pelo menos uma repetição antes de continuar.");
        setStatus("Playlist pausada para revisar o próximo vídeo.");
        return;
      }
      setActiveIndex(nextIndex);
      setRemaining(nextVideo.repetitions);
      setPlayed(0);
      setLoaded(0);
      seekingRef.current = false;
      setHasPlaybackStarted(false);
      setStatus(`Reproduzindo vídeo ${nextIndex + 1} de ${queue.length}.`);
      return;
    }
    setIsPlaying(false);
    setStatus("Sessão concluída. Entre para manter este histórico.");
    setResumeSession(null);
    if (session.data?.user) void fetch("/api/playback-session", { method: "DELETE" });
  };

  const handleEnded = (videoId: string) => {
    if (!activeVideo || activeIndex === null || !hasPlaybackStarted || videoId !== activeVideoIdRef.current) return;
    endedVideoIdRef.current = videoId;
    if (remaining > 1) playNextRepetition(false);
    else playNextVideo(false);
  };

  const handlePlaybackError = () => {
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setRemaining(0);
    setDuration(null);(0);
(0);
    const src = activeVideo?.src ?? "";
    // Diferencia fonte não suportada (nem o ReactPlayer reconhece) de falha
    // de rede/embed privado — cada caso pede uma ação diferente do usuário.
    setError(
      src && !canPlaySrc(src)
        ? "Esta fonte não é suportada pelo player. Use YouTube, Vimeo, HLS/DASH ou um arquivo de vídeo/áudio direto."
        : "Não foi possível carregar este vídeo. Pode ser embed desativado, vídeo privado/restrito ou falha de rede — tente outra fonte.",
    );
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

  const seekBy = (seconds: number) => {
    const node = playerRef.current;
    if (!node || !Number.isFinite(node.duration) || node.duration <= 0) return;
    try {
      node.currentTime = Math.min(Math.max(0, node.currentTime + seconds), node.duration);
    } catch { /* provider não suporta seek */ }
  };

  const goFullscreen = () => {
    const el = document.querySelector(".replay-player");
    if (el && screenfull.isEnabled) void screenfull.request(el);
  };

  const handleRateChange = () => {
    const rate = playerRef.current?.playbackRate;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) setPlaybackRate(rate);
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
  };

  // Slider de posição (padrão da demo oficial): lê do elemento, escreve no mouseUp.
  const handleTimeUpdate = () => {
    const node = playerRef.current;
    if (!node || seekingRef.current || !Number.isFinite(node.duration) || !node.duration) return;
    setPlayed(node.currentTime / node.duration);
  };

  // Faixa "carregado" atrás do seek (guards da demo: sem buffered, sem update).
  const handleProgress = () => {
    const node = playerRef.current;
    if (!node || !node.buffered?.length || !Number.isFinite(node.duration) || !node.duration) return;
    try {
      setLoaded(node.buffered.end(node.buffered.length - 1) / node.duration);
    } catch { /* buffered indisponível neste provider */ }
  };

  const handleSeekSliderDown = () => { seekingRef.current = true; };

  const handleSeekSliderChange = (value: number) => {
    if (Number.isFinite(value)) setPlayed(Math.min(Math.max(0, value), 1));
  };

  const handleSeekSliderUp = (value: number) => {
    const node = playerRef.current;
    seekingRef.current = false;
    if (node && Number.isFinite(node.duration) && node.duration > 0 && Number.isFinite(value)) {
      try { node.currentTime = Math.min(Math.max(0, value), 1) * node.duration; } catch { /* provider não suporta seek */ }
    }
  };

  // Seeks programáticos (repetição: volta ao 0 no ended) não podem sujar a
  // contagem; seeks manuais só movem currentTime, a contagem segue por ended.
  const handleSeeked = () => {
    if (programmaticSeekRef.current) programmaticSeekRef.current = false;
  };

  const handlePlaybackPause = (videoId: string) => {
    if (!activeVideo || !hasPlaybackStarted || videoId !== activeVideoIdRef.current || endedVideoIdRef.current === videoId) return;
    setIsPlaying(false);
    setHasPlaybackStarted(false);
    setStatus("Reprodução pausada.");
  };

  return (
    <>
      <header className="studio-heading">
        <div className="navbar-inner">
          <h1 id="studio-title"><Link className="brand-mark" href="/"><span aria-hidden="true"><Orbit size={20} /></span>Celestial Replay</Link></h1>
          <AuthControls />
        </div>
      </header>

      <section className="studio-shell" aria-labelledby="studio-title">
        <nav className="studio-tabs" aria-label="Áreas do Celestial Replay">
          <button className={mode === "single" ? "studio-tab is-selected" : "studio-tab"} type="button" onClick={() => setMode("single")} aria-pressed={mode === "single"}><Video aria-hidden="true" size={16} />Vídeo único</button>
          <button className={mode === "playlist" ? "studio-tab is-selected" : "studio-tab"} type="button" onClick={() => setMode("playlist")} aria-pressed={mode === "playlist"}><ListMusic aria-hidden="true" size={16} />Playlist</button>
          <AccountStudioTabs />
        </nav>

        {resumeSession && <aside className="resume-session" aria-label="Sessão disponível para retomar"><div><strong>Continue de onde parou</strong><span>{resumeSession.playlistName} · vídeo {resumeSession.activeIndex + 1} de {resumeSession.queue.length}</span></div><button className="secondary-button" type="button" onClick={resume}><RotateCcw aria-hidden="true" size={16} />Retomar</button></aside>}

        <div className="studio-grid">
          <form className={`control-surface ${mode === "playlist" ? "playlist-form" : ""}`} onSubmit={start}>
            {mode === "single" ? <>
              <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Configurar repetição</h2></div>
              <label htmlFor="source">URL do vídeo</label>
              <input id="source" value={source} onChange={(event) => { setSource(event.target.value); setError(null); }} placeholder="https://www.youtube.com/watch?v=..." inputMode="url" autoComplete="url" />
              <label htmlFor="repetitions">Repetições</label>
              <input id="repetitions" type="number" min="1" step="1" value={repetitions} onChange={(event) => setRepetitions(event.target.value)} />
              <p className="field-help">Ex.: 3 reproduz o mesmo vídeo três vezes completas.</p>
            </> : isEditingQueue ? <div className="playlist-running-note">
              <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Playlist em andamento</h2></div>
              <p>Os próximos vídeos podem ser editados logo abaixo.</p>
              <button className="add-row" type="button" onClick={startNewPlaylist}>Nova playlist</button>
            </div> : <>
              <div className="playlist-heading">
                <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Monte sua playlist</h2></div>
                <p>Escolha a forma que for mais confortável. A playlist só começa quando tudo estiver válido.</p>
              </div>
              <div className="playlist-input-mode" role="tablist" aria-label="Forma de montar a playlist">
                <button className={playlistInputMode === "simple" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={playlistInputMode === "simple"} onClick={() => setPlaylistInputMode("simple")}>Simples: linhas</button>
                <button className={playlistInputMode === "advanced" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={playlistInputMode === "advanced"} onClick={() => setPlaylistInputMode("advanced")}>Avançado: campos</button>
              </div>
              {savedPlaylists.length > 0 && <section className="saved-playlists" aria-labelledby="saved-playlists-title">
                <h3 id="saved-playlists-title">Minhas playlists</h3>
                <div>{savedPlaylists.map((playlist) => <button className="saved-playlist" type="button" key={playlist.id} onClick={() => loadSavedPlaylist(playlist)}>{playlist.name}<span>{playlist.items.length} {playlist.items.length === 1 ? "vídeo" : "vídeos"}</span></button>)}</div>
              </section>}
              {playlistInputMode === "simple" ? <div className="simple-playlist-input">
                <label htmlFor="simple-playlist">Vídeos e repetições</label>
                <textarea id="simple-playlist" value={simplePlaylist} onChange={(event) => { setSimplePlaylist(event.target.value); setError(null); }} placeholder={"https://youtube.com/watch?v=exemplo;3\nhttps://vimeo.com/exemplo;1"} spellCheck="false" />
                <p>Uma linha por vídeo: <code>link;quantidade</code>.</p>
              </div> : <div className="playlist-editor" aria-label="Vídeos da playlist">
                {drafts.map((draft, index) => {
                  const count = Number(draft.repetitions);
                  const touched = draft.src.trim() !== "" || draft.repetitions !== "1";
                  const rowInvalid = touched && !(isPlayableMediaUrl(draft.src.trim()) && canPlaySrc(draft.src.trim()) && Number.isInteger(count) && count > 0);
                  return <div className="playlist-row" key={draft.id}>
                  <span className="row-number" aria-hidden="true">{index + 1}</span>
                  <label className="sr-only" htmlFor={`playlist-url-${draft.id}`}>URL do vídeo {index + 1}</label>
                  <input id={`playlist-url-${draft.id}`} value={draft.src} onChange={(event) => updateDraft(draft.id, "src", event.target.value)} placeholder="Cole a URL do vídeo" inputMode="url" autoComplete="url" aria-invalid={rowInvalid} />
                  <label className="sr-only" htmlFor={`playlist-count-${draft.id}`}>Repetições do vídeo {index + 1}</label>
                  <input id={`playlist-count-${draft.id}`} type="number" min="1" step="1" value={draft.repetitions} onChange={(event) => updateDraft(draft.id, "repetitions", event.target.value)} aria-invalid={rowInvalid} />
                {drafts.length > 1 && <button className="remove-row" type="button" onClick={() => setDrafts((items) => items.filter((item) => item.id !== draft.id))} aria-label={`Remover vídeo ${index + 1}`}><Trash2 aria-hidden="true" size={18} /></button>}
                </div>;})}
              </div>}
              {playlistInputMode === "advanced" && <button className="add-row" type="button" onClick={() => setDrafts((items) => [...items, makeDraft()])}><Plus aria-hidden="true" size={18} />Adicionar outro vídeo</button>}
              {isLoggedIn && <div className="playlist-save"><button className="icon-save-button" type="button" onClick={() => openSaveDialog("draft")} disabled={!canSubmitPlaylist || isSavingPlaylist} aria-label="Salvar playlist" title="Salvar playlist"><Save aria-hidden="true" size={18} /></button></div>}
              {playlistSaveMessage && <p className="field-help playlist-save-message" role="status">{playlistSaveMessage}</p>}
            </>}
            {error && <p className="field-error" role="alert">{error}</p>}
            {!isEditingQueue && <button className="primary-button" type="submit" disabled={mode === "single" ? !canSubmitSingle : !canSubmitPlaylist}><Play aria-hidden="true" size={18} />{mode === "single" ? "Iniciar" : "Iniciar playlist"}</button>}
            {!isEditingQueue && (mode === "single" ? singleHint : playlistHint) && <p className="field-help" role="status">{mode === "single" ? singleHint : playlistHint}</p>}
            {!isEditingQueue && !activeVideo && previewVideo && !error && <div className="control-group preview-rate" role="toolbar" aria-label="Velocidade inicial"><span>Velocidade</span>{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-pressed={playbackRate === rate} onClick={() => setPlaybackRate(rate)} title={`Começar em ${rate}x`}>{rate}x</button>)}</div>}
          </form>

          <div className="player-surface">
            <div className="player-stage">
              {previewVideo && !error && <span className="preview-badge">Prévia — clique em Iniciar</span>}
              {displayedVideo && !error ? <ReactPlayer className="replay-player" ref={playerRef} innerRef={playerRef} src={displayedVideo.src} playing={activeVideo ? isPlaying : false} light={false} controls playsInline volume={volume} muted={volume === 0} playbackRate={playbackRate} pip={pip} width="100%" style={{ width: "100%", height: "auto", aspectRatio: "16/9" }} config={{ youtube: { color: "white" }, vimeo: { color: "ffffff" } }} onReady={activeVideo ? () => handlePlayerReady(activeVideo.id) : undefined} onStart={activeVideo ? () => handlePlaybackPlay(activeVideo.id) : undefined} onPlay={activeVideo ? () => handlePlaybackPlay(activeVideo.id) : undefined} onPlaying={activeVideo ? () => handlePlaybackStarted(activeVideo.id) : undefined} onPause={activeVideo ? () => handlePlaybackPause(activeVideo.id) : undefined} onRateChange={activeVideo ? handleRateChange : undefined} onTimeUpdate={activeVideo ? handleTimeUpdate : undefined} onProgress={activeVideo ? handleProgress : undefined} onSeeked={activeVideo ? handleSeeked : undefined} onEnterPictureInPicture={activeVideo ? () => setPip(true) : undefined} onLeavePictureInPicture={activeVideo ? () => setPip(false) : undefined} onEnded={activeVideo ? () => handleEnded(activeVideo.id) : undefined} onDurationChange={activeVideo ? (event) => { const d = event.currentTarget?.duration; if (Number.isFinite(d)) setDuration(d); } : undefined} onError={activeVideo ? handlePlaybackError : () => setError("Não foi possível carregar esta URL para prévia.")} /> : <div className="player-empty"><Play aria-hidden="true" size={30} /><p>{error ? "A reprodução foi interrompida para esta fonte." : "O player aparece aqui quando a sessão começar."}</p></div>}
            </div>
            <div className="session-bar" role="status" aria-live="polite" aria-atomic="true"><span>{progressLabel ?? playerStatus}{duration && activeVideo && !error && hasPlaybackStarted ? <small>≈ {Math.ceil((duration * remaining) / 60)} min neste vídeo</small> : null}</span>{activeVideo && remaining > 0 && !error && hasPlaybackStarted && <strong>{remaining} {remaining === 1 ? "repetição restante" : "repetições restantes"}</strong>}</div>
            {queue.length > 0 && activeIndex !== null && totalRepetitions > 0 && !error && <div className="playlist-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((completedRepetitions / totalRepetitions) * 100)} aria-label="Progresso da playlist"><i style={{ width: `${(completedRepetitions / totalRepetitions) * 100}%` }} /></div>}
            {activeVideo && !error && <div className="control-bar">
              <div className="control-group"><button className="pause-button" type="button" onClick={togglePlay}>{isPlaying && hasPlaybackStarted ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}{isPlaying ? hasPlaybackStarted ? "Pausar" : "Iniciando…" : "Continuar"}</button></div>
              <div className="control-group" role="toolbar" aria-label="Navegar">{hasPrevVideo && <button className="icon-save-button" type="button" onClick={playPreviousVideo} aria-label="Vídeo anterior" title="Vídeo anterior (B)"><SkipBack aria-hidden="true" size={18} /></button>}<button className="icon-save-button" type="button" onClick={playPreviousRepetition} disabled={!canGoBackRepetition} aria-label="Voltar repetição" title="Voltar repetição"><StepBack aria-hidden="true" size={18} /></button><button className="icon-save-button" type="button" onClick={() => playNextRepetition(true)} disabled={!canSkipRepetition} aria-label="Pular repetição" title="Pular repetição"><SkipForward aria-hidden="true" size={18} /></button>{hasNextVideo && <button className="icon-save-button" type="button" onClick={() => playNextVideo(true)} aria-label="Próximo vídeo" title="Próximo vídeo (N)"><StepForward aria-hidden="true" size={18} /></button>}</div>
              {duration !== null && duration > 0 && <div className="control-group seek-group"><label className="seek-control" htmlFor="seek"><span className="seek-time">{formatTime(played * duration)}</span><input id="seek" type="range" min={0} max={0.999999} step="any" value={played} style={{ background: `linear-gradient(90deg, rgba(220,231,255,.9) ${played * 100}%, rgba(190,207,248,.35) ${played * 100}%, rgba(190,207,248,.35) ${Math.max(played, Math.min(loaded, 1)) * 100}%, rgba(190,207,248,.12) ${Math.max(played, Math.min(loaded, 1)) * 100}%)` }} onMouseDown={handleSeekSliderDown} onTouchStart={handleSeekSliderDown} onChange={(event) => handleSeekSliderChange(Number(event.target.value))} onMouseUp={(event) => handleSeekSliderUp(Number(event.currentTarget.value))} onTouchEnd={(event) => handleSeekSliderUp(Number(event.currentTarget.value))} /><span className="seek-time">{formatTime(duration)}</span></label></div>}
              <div className="control-group"><button className="icon-save-button" type="button" onClick={toggleMute} aria-label={volume === 0 ? "Ativar som" : "Silenciar"} title={volume === 0 ? "Ativar som (M)" : "Silenciar (M)"}>{volume === 0 ? <VolumeX aria-hidden="true" size={18} /> : <Volume2 aria-hidden="true" size={18} />}</button><input className="volume-slider" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" title="Volume" /></div>
              <div className="control-group" role="toolbar" aria-label="Velocidade">{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-pressed={playbackRate === rate} onClick={() => setPlaybackRate(rate)} title={`Velocidade ${rate}x`}>{rate}x</button>)}</div>
              <div className="control-group" role="toolbar" aria-label="Tela">{displayedVideo && canEnablePIP(displayedVideo.src) && <button className="icon-save-button" type="button" onClick={() => setPip((value) => !value)} aria-label="Picture-in-picture" title="Picture-in-picture" aria-pressed={pip}><PictureInPicture2 aria-hidden="true" size={18} /></button>}<button className="icon-save-button" type="button" onClick={goFullscreen} aria-label="Tela cheia" title="Tela cheia"><Maximize aria-hidden="true" size={18} /></button></div>
            </div>}
            {activeVideo && <p className="keyboard-help"><Keyboard aria-hidden="true" size={14} />Espaço pausa · M silencia · ↑ ↓ volume · J/L ∓10s · N/B vídeo seguinte/anterior</p>}
          </div>
        </div>

        {mode === "playlist" && queue.length > 0 && <section className="queue-surface" aria-labelledby="queue-title">
          <div className="queue-title"><div><h2 id="queue-title">Playlist em execução</h2><p>Edite somente os vídeos que ainda não começaram.</p></div><span>{queue.length} vídeos</span></div>
          {isLoggedIn && <div className="queue-save"><button className="icon-save-button" type="button" onClick={() => openSaveDialog("queue")} disabled={isSavingQueue} aria-label="Salvar playlist em execução" title="Salvar playlist"><Save aria-hidden="true" size={18} /></button></div>}
          {queueSaveMessage && <p className="field-help queue-save-message" role="status">{queueSaveMessage}</p>}
          <ol>{queue.map((item, index) => {
            const isCurrent = index === activeIndex;
            const isFuture = activeIndex !== null && index > activeIndex;
            const state = isCurrent ? error ? "Não reproduzível" : hasPlaybackStarted ? isPlaying ? "Tocando agora" : "Pausado" : "Carregando" : index < (activeIndex ?? 0) ? "Concluído" : "A seguir";
            return <li className={isCurrent ? "queue-item is-current" : "queue-item"} key={item.id}>
              <span className="queue-state"><b>{index + 1}</b><small>{state}</small></span>
              {isFuture ? <>
                <label className="sr-only" htmlFor={`queue-url-${item.id}`}>URL do vídeo {index + 1}</label>
                <input id={`queue-url-${item.id}`} value={item.src} onChange={(event) => updateUpcomingItem(item.id, "src", event.target.value)} aria-invalid={!isPlayableMediaUrl(item.src.trim())} />
                <label className="sr-only" htmlFor={`queue-count-${item.id}`}>Repetições do vídeo {index + 1}</label>
                <input id={`queue-count-${item.id}`} type="number" min="1" step="1" value={Number.isFinite(item.repetitions) ? item.repetitions : ""} onChange={(event) => updateUpcomingItem(item.id, "repetitions", event.target.value)} aria-invalid={!isPlayableItem(item)} />
                <button className="queue-remove" type="button" onClick={() => removeFutureItem(item.id)} aria-label={`Remover vídeo ${index + 1} da fila`} title="Remover da fila"><Trash2 aria-hidden="true" size={15} /></button>
              </> : <><span className="queue-url">{item.src}</span><span className="queue-count">{item.repetitions}×</span></>}
            </li>;
          })}</ol>
        </section>}
      </section>
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
}
