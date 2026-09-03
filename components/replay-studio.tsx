"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListMusic, ListPlus, Orbit, Pause, Play, Plus, Trash2, Video, Volume2 } from "lucide-react";

import { AuthControls } from "@/components/auth-controls";
import { AccountStudioTabs } from "@/components/account-studio-tabs";
import { isPlayableMediaUrl } from "@/lib/media-url";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type VideoItem = { id: string; src: string; repetitions: number };
type PlaylistDraft = { id: string; src: string; repetitions: string };
type ParsedPlaylistItem = { src: string; count: number };
type SavedPlaylist = { id: string; name: string; items: Array<{ id: string; url: string; repetitions: number }> };

const makeItem = (src: string, repetitions: number): VideoItem => ({ id: crypto.randomUUID(), src, repetitions });
const makeDraft = (): PlaylistDraft => ({ id: crypto.randomUUID(), src: "", repetitions: "1" });

const isPlayableItem = (item: VideoItem) => isPlayableMediaUrl(item.src.trim()) && Number.isInteger(item.repetitions) && item.repetitions > 0;

function parsePlaylistLines(value: string): ParsedPlaylistItem[] | null {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const parsed = lines.map((line) => {
    const [src, repetitions, ...extra] = line.split(";").map((part) => part.trim());
    const count = Number(repetitions);
    return extra.length === 0 && isPlayableMediaUrl(src) && Number.isInteger(count) && count > 0 ? { src, count } : null;
  });
  return parsed.every(Boolean) ? parsed as ParsedPlaylistItem[] : null;
}

export function ReplayStudio({ initialMode = "single" }: { initialMode?: "single" | "playlist" }) {
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
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Pronto para uma nova sessão.");

  const activeVideo = activeIndex === null ? null : queue[activeIndex] ?? null;
  const parsedRepetitions = Number(repetitions);
  const canSubmitSingle = isPlayableMediaUrl(source.trim()) && Number.isInteger(parsedRepetitions) && parsedRepetitions > 0;
  const playlistItems = useMemo(() => drafts.map((draft) => ({ ...draft, count: Number(draft.repetitions) })), [drafts]);
  const simplePlaylistItems = useMemo(() => parsePlaylistLines(simplePlaylist), [simplePlaylist]);
  const canSubmitPlaylist = playlistInputMode === "simple"
    ? simplePlaylistItems !== null
    : playlistItems.length > 0 && playlistItems.every((item) => isPlayableMediaUrl(item.src.trim()) && Number.isInteger(item.count) && item.count > 0);
  const isEditingQueue = mode === "playlist" && activeIndex !== null && queue.length > 0;

  useEffect(() => {
    if (mode !== "playlist") return;
    void fetch("/api/playlists").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { playlists: SavedPlaylist[] };
      setSavedPlaylists(result.playlists);
    }).catch(() => undefined);
  }, [mode]);

  const updateDraft = (id: string, field: "src" | "repetitions", value: string) => {
    setDrafts((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
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
    setError(null);
    setStatus("Pronto para montar uma nova playlist.");
  };

  const savePlaylist = async () => {
    if (!canSubmitPlaylist) {
      setError("Revise a playlist antes de salvar: cada vídeo precisa de URL válida e repetições maiores que zero.");
      return;
    }

    const entries = playlistInputMode === "simple" ? simplePlaylistItems! : playlistItems;
    setIsSavingPlaylist(true);
    setPlaylistSaveMessage(null);
    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: playlistName,
        items: entries.map((item) => ({ url: item.src.trim(), repetitions: item.count })),
      }),
    });
    const result = await response.json().catch(() => null);
    setIsSavingPlaylist(false);

    if (!response.ok) {
      setPlaylistSaveMessage(result?.error ?? "Não foi possível salvar a playlist agora.");
      return;
    }
    setSavedPlaylists((items) => [result.playlist as SavedPlaylist, ...items.filter((item) => item.id !== result.playlist.id)]);
    setPlaylistSaveMessage("Playlist salva na sua conta.");
  };

  const loadSavedPlaylist = (playlist: SavedPlaylist) => {
    setPlaylistName(playlist.name);
    setQueuePlaylistName(playlist.name);
    setPlaylistInputMode("advanced");
    setDrafts(playlist.items.map((item) => ({ id: crypto.randomUUID(), src: item.url, repetitions: String(item.repetitions) })));
    setError(null);
    setPlaylistSaveMessage(`Playlist “${playlist.name}” carregada. Revise ou inicie quando quiser.`);
  };

  const saveQueuePlaylist = async () => {
    if (queue.length === 0 || !queue.every(isPlayableItem) || !queuePlaylistName.trim()) {
      setQueueSaveMessage("Dê um nome e revise os vídeos antes de salvar.");
      return;
    }

    setIsSavingQueue(true);
    setQueueSaveMessage(null);
    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: queuePlaylistName, items: queue.map((item) => ({ url: item.src.trim(), repetitions: item.repetitions })) }),
    });
    const result = await response.json().catch(() => null);
    setIsSavingQueue(false);
    if (!response.ok) {
      setQueueSaveMessage(result?.error ?? "Não foi possível salvar a playlist agora.");
      return;
    }
    setSavedPlaylists((items) => [result.playlist as SavedPlaylist, ...items.filter((item) => item.id !== result.playlist.id)]);
    setQueueSaveMessage("Playlist salva na sua conta.");
  };

  const recordCompletedVideo = (item: VideoItem) => {
    void fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: item.src, completedRepetitions: item.repetitions }),
    });
  };

  const start = (event: FormEvent) => {
    event.preventDefault();

    if (mode === "single") {
      if (!canSubmitSingle) {
        setError("Informe uma URL válida e um número inteiro de repetições maior que zero.");
        return;
      }
      const item = makeItem(source.trim(), parsedRepetitions);
      setQueue([item]);
      setActiveIndex(0);
      setRemaining(item.repetitions);
      setIsPlaying(true);
      setError(null);
      setStatus(`Reproduzindo 1 de ${item.repetitions}.`);
      return;
    }

    if (!canSubmitPlaylist) {
      setError("Revise cada linha: todas precisam ter uma URL válida e pelo menos uma repetição.");
      return;
    }
    const entries = playlistInputMode === "simple" ? simplePlaylistItems! : playlistItems;
    const nextQueue = entries.map((item) => makeItem(item.src.trim(), item.count));
    setQueuePlaylistName(playlistName.trim() || "Minha playlist");
    setQueue(nextQueue);
    setActiveIndex(0);
    setRemaining(nextQueue[0].repetitions);
    setIsPlaying(true);
    setError(null);
    setStatus(`Playlist iniciada: vídeo 1 de ${nextQueue.length}.`);
  };

  const handleEnded = () => {
    if (!activeVideo || activeIndex === null) return;
    if (remaining > 1) {
      const nextRemaining = remaining - 1;
      setRemaining(nextRemaining);
      setStatus(`Reproduzindo ${activeVideo.repetitions - nextRemaining + 1} de ${activeVideo.repetitions}.`);
      return;
    }
    const nextIndex = activeIndex + 1;
    recordCompletedVideo(activeVideo);
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
      setStatus(`Avançou para o vídeo ${nextIndex + 1} de ${queue.length}.`);
      return;
    }
    setIsPlaying(false);
    setStatus("Sessão concluída. Entre para manter este histórico.");
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

        <div className="studio-grid">
          <form className={`control-surface ${mode === "playlist" ? "playlist-form" : ""}`} onSubmit={start}>
            {mode === "single" ? <>
              <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Configurar repetição</h2></div>
              <label htmlFor="source">URL do vídeo</label>
              <input id="source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." inputMode="url" autoComplete="url" />
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
                {drafts.map((draft, index) => <div className="playlist-row" key={draft.id}>
                  <span className="row-number" aria-hidden="true">{index + 1}</span>
                  <label className="sr-only" htmlFor={`playlist-url-${draft.id}`}>URL do vídeo {index + 1}</label>
                  <input id={`playlist-url-${draft.id}`} value={draft.src} onChange={(event) => updateDraft(draft.id, "src", event.target.value)} placeholder="Cole a URL do vídeo" inputMode="url" autoComplete="url" />
                  <label className="sr-only" htmlFor={`playlist-count-${draft.id}`}>Repetições do vídeo {index + 1}</label>
                  <input id={`playlist-count-${draft.id}`} type="number" min="1" step="1" value={draft.repetitions} onChange={(event) => updateDraft(draft.id, "repetitions", event.target.value)} />
                {drafts.length > 1 && <button className="remove-row" type="button" onClick={() => setDrafts((items) => items.filter((item) => item.id !== draft.id))} aria-label={`Remover vídeo ${index + 1}`}><Trash2 aria-hidden="true" size={18} /></button>}
                </div>)}
              </div>}
              {playlistInputMode === "advanced" && <button className="add-row" type="button" onClick={() => setDrafts((items) => [...items, makeDraft()])}><Plus aria-hidden="true" size={18} />Adicionar outro vídeo</button>}
              <div className="playlist-save">
                <label htmlFor="playlist-name">Nome para salvar</label>
                <input id="playlist-name" value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} maxLength={80} />
                <button className="secondary-button" type="button" onClick={savePlaylist} disabled={!canSubmitPlaylist || isSavingPlaylist}>{isSavingPlaylist ? "Salvando…" : "Salvar playlist"}</button>
              </div>
              {playlistSaveMessage && <p className="field-help playlist-save-message" role="status">{playlistSaveMessage}</p>}
            </>}
            {error && <p className="field-error" role="alert">{error}</p>}
            {!isEditingQueue && <button className="primary-button" type="submit" disabled={mode === "single" ? !canSubmitSingle : !canSubmitPlaylist}><Play aria-hidden="true" size={18} />{mode === "single" ? "Iniciar repetição" : "Iniciar playlist"}</button>}
          </form>

          <div className="player-surface">
            <div className="player-stage">
              {activeVideo ? <ReactPlayer className="replay-player" key={`${activeVideo.id}-${remaining}`} src={activeVideo.src} playing={isPlaying} controls playsInline volume={volume} width="100%" height="100%" onEnded={handleEnded} onError={() => { setIsPlaying(false); setError("Não foi possível reproduzir esta URL. Verifique as permissões do vídeo ou tente outra fonte suportada."); }} /> : <div className="player-empty"><Play aria-hidden="true" size={30} /><p>O player aparece aqui quando a sessão começar.</p></div>}
            </div>
            <div className="session-bar" role="status" aria-live="polite" aria-atomic="true"><span>{status}</span>{activeVideo && <strong>{remaining} {remaining === 1 ? "repetição restante" : "repetições restantes"}</strong>}</div>
            <label className="volume-control" htmlFor="volume"><Volume2 aria-hidden="true" size={18} /><span>Volume</span><input id="volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
            {activeVideo && <button className="pause-button" type="button" onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}{isPlaying ? "Pausar" : "Continuar"}</button>}
          </div>
        </div>

        {mode === "playlist" && queue.length > 0 && <section className="queue-surface" aria-labelledby="queue-title">
          <div className="queue-title"><div><h2 id="queue-title">Playlist em execução</h2><p>Edite somente os vídeos que ainda não começaram.</p></div><span>{queue.length} vídeos</span></div>
          <div className="queue-save"><label htmlFor="queue-playlist-name">Salvar esta fila como</label><input id="queue-playlist-name" value={queuePlaylistName} onChange={(event) => setQueuePlaylistName(event.target.value)} maxLength={80} /><button className="secondary-button" type="button" onClick={saveQueuePlaylist} disabled={isSavingQueue}>{isSavingQueue ? "Salvando…" : "Salvar"}</button></div>
          {queueSaveMessage && <p className="field-help queue-save-message" role="status">{queueSaveMessage}</p>}
          <ol>{queue.map((item, index) => {
            const isCurrent = index === activeIndex;
            const isFuture = activeIndex !== null && index > activeIndex;
            const state = isCurrent ? "Tocando agora" : index < (activeIndex ?? 0) ? "Concluído" : "A seguir";
            return <li className={isCurrent ? "queue-item is-current" : "queue-item"} key={item.id}>
              <span className="queue-state"><b>{index + 1}</b><small>{state}</small></span>
              {isFuture ? <>
                <label className="sr-only" htmlFor={`queue-url-${item.id}`}>URL do vídeo {index + 1}</label>
                <input id={`queue-url-${item.id}`} value={item.src} onChange={(event) => updateUpcomingItem(item.id, "src", event.target.value)} aria-invalid={!isPlayableMediaUrl(item.src.trim())} />
                <label className="sr-only" htmlFor={`queue-count-${item.id}`}>Repetições do vídeo {index + 1}</label>
                <input id={`queue-count-${item.id}`} type="number" min="1" step="1" value={Number.isFinite(item.repetitions) ? item.repetitions : ""} onChange={(event) => updateUpcomingItem(item.id, "repetitions", event.target.value)} aria-invalid={!isPlayableItem(item)} />
              </> : <><span className="queue-url">{item.src}</span><span className="queue-count">{item.repetitions}×</span></>}
            </li>;
          })}</ol>
        </section>}
      </section>
    </>
  );
}
