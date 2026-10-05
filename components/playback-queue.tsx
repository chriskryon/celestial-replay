import { ChevronDown, ExternalLink, Play, Plus, Save, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { canPlaySrc } from "@/components/react-player-client";
import { normalizeVideoUrlInput } from "@/lib/media-url";
import { isPlayableItem, parseSingleReplay, type VideoItem } from "@/lib/replay-playlist";
import { isSupportedReplaySource } from "@/lib/replay-source";
import { uploadDisplayNameFromUrl } from "@/lib/upload-display";

type PlaybackQueueProps = {
  activeIndex: number | null;
  completedQueue: VideoItem[];
  error: string | null;
  hasPlaybackStarted: boolean;
  isLoggedIn: boolean;
  isSavedPlaylist: boolean;
  isPlaying: boolean;
  isSaving: boolean;
  isSessionComplete: boolean;
  metadata: Record<string, { authorName: string | null; title: string | null; loading: boolean }>;
  onAddToQueue: (source: string, repetitions: string) => boolean;
  onRemoveFutureItem: (id: string) => void;
  onRestartSession: () => void;
  onSave: () => void;
  onStartNewPlaylist: () => void;
  onStop: () => void;
  onUpdateUpcomingItem: (id: string, field: "src" | "repetitions", value: string) => void;
  queue: VideoItem[];
  remaining: number;
  saveMessage: string | null;
  visibleQueue: VideoItem[];
};

export function PlaybackQueue({
  activeIndex,
  completedQueue,
  error,
  hasPlaybackStarted,
  isLoggedIn,
  isSavedPlaylist,
  isPlaying,
  isSaving,
  isSessionComplete,
  metadata,
  onAddToQueue,
  onRemoveFutureItem,
  onRestartSession,
  onSave,
  onStartNewPlaylist,
  onStop,
  onUpdateUpcomingItem,
  queue,
  remaining,
  saveMessage,
  visibleQueue,
}: PlaybackQueueProps) {
  const skippedQueue = queue.filter((item) => item.skippedRepetitions);
  const concludedQueue = queue.filter((item) => !item.skippedRepetitions);
  const completeLabel = skippedQueue.length ? "Fila encerrada" : "Playlist concluída";
  const completeSummary = `${concludedQueue.length} ${concludedQueue.length === 1 ? "vídeo concluído" : "vídeos concluídos"}${skippedQueue.length ? ` · ${skippedQueue.length} ${skippedQueue.length === 1 ? "pulado" : "pulados"}` : ""}`;
  const currentItemRef = useRef<HTMLLIElement | null>(null);
  const [recentIndex, setRecentIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [newRepetitions, setNewRepetitions] = useState("1");
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const canAdd = Boolean(parseSingleReplay(newSource, newRepetitions, canPlaySrc));
  const addToQueue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onAddToQueue(newSource, newRepetitions)) {
      setQueueMessage("Não foi possível adicionar. Confira o link e as repetições ou inicie uma nova sessão.");
      return;
    }
    setNewSource("");
    setQueueMessage("Vídeo adicionado ao fim da fila.");
  };
  const currentItem = isSessionComplete || activeIndex === null ? null : queue[activeIndex] ?? null;
  const currentMetadata = currentItem ? metadata[currentItem.src] : null;
  const currentTitle = currentItem ? currentMetadata?.title ?? uploadDisplayNameFromUrl(currentItem.src) ?? (() => {
    try { return new URL(currentItem.src).hostname.replace(/^www\./, ""); } catch { return "Vídeo atual"; }
  })() : null;

  useEffect(() => {
    if (isExpanded) currentItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (activeIndex === null) return;
    setRecentIndex(activeIndex);
    const timeout = window.setTimeout(() => setRecentIndex(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [activeIndex, isExpanded]);

  const renderQueueItem = (item: VideoItem, index: number) => {
    const isCurrent = !isSessionComplete && index === activeIndex;
    const isFuture = !isSessionComplete && activeIndex !== null && index > activeIndex;
    const state = item.skippedRepetitions ? "Pulado por erro" : isSessionComplete
      ? "Concluído"
      : isCurrent
      ? error
        ? "Não reproduzível"
        : hasPlaybackStarted
          ? isPlaying ? "Tocando agora" : "Pausado"
          : "Iniciando"
      : index < (activeIndex ?? 0) ? "Concluído" : "A seguir";
    const itemMetadata = metadata[item.src];
    const displayTitle = itemMetadata?.title ?? uploadDisplayNameFromUrl(item.src) ?? (() => {
      try { return new URL(item.src).hostname.replace(/^www\./, ""); } catch { return item.src; }
    })();
    const uploadTitle = uploadDisplayNameFromUrl(item.src);

    return (
      <li ref={isCurrent ? currentItemRef : undefined} className={`queue-item${isCurrent ? " is-current" : ""}${recentIndex === index ? " is-recent" : ""}`} key={item.id}>
        <span className="queue-state">
          <b>{index + 1}</b>
          <small title={state}>{state}</small>
        </span>
        {isFuture ? <>
          <label className="sr-only" htmlFor={`queue-url-${item.id}`}>URL do vídeo {index + 1}</label>
          <input
            id={`queue-url-${item.id}`}
            value={item.src}
            onChange={(event) => onUpdateUpcomingItem(item.id, "src", event.target.value)}
            aria-invalid={!isSupportedReplaySource(item.src, canPlaySrc)}
          />
          <label className="sr-only" htmlFor={`queue-count-${item.id}`}>Repetições do vídeo {index + 1}</label>
          <input
            id={`queue-count-${item.id}`}
            type="number"
            min="1"
            step="1"
            value={Number.isFinite(item.repetitions) ? item.repetitions : ""}
            onChange={(event) => onUpdateUpcomingItem(item.id, "repetitions", event.target.value)}
            aria-invalid={!isPlayableItem(item, canPlaySrc)}
          />
          <button
            className="queue-remove"
            type="button"
            onClick={() => onRemoveFutureItem(item.id)}
            aria-label={`Remover vídeo ${index + 1} da fila`}
            title="Remover da fila"
          >
            <Trash2 aria-hidden="true" size={15} />
          </button>
        </> : <>
          <span className="queue-media-copy">
            {itemMetadata?.loading ? <span className="cosmic-skeleton queue-title-skeleton" aria-label="Carregando título do vídeo" /> : <strong>{displayTitle}</strong>}
            {(itemMetadata?.authorName || uploadTitle) && <small>{uploadTitle ? "Áudio enviado" : itemMetadata?.authorName}</small>}
            <a className="queue-url" href={item.src} target="_blank" rel="noreferrer" title={item.src}><ExternalLink aria-hidden="true" size={12} />Abrir origem</a>
          </span>
          <span className="queue-count">{item.repetitions}×</span>
        </>}
      </li>
    );
  };

  return <section className={`queue-surface${isExpanded ? " is-expanded" : " is-collapsed"}`} aria-labelledby="queue-title">
    <div className="queue-title">
      <button className="queue-toggle" type="button" onClick={() => setIsExpanded((value) => !value)} aria-controls="queue-content" aria-expanded={isExpanded}>
        <span className="queue-toggle-copy">
          <strong id="queue-title">{isSessionComplete ? completeLabel : "Playlist em execução"}</strong>
          <small key={isSessionComplete ? "complete" : activeIndex ?? "idle"}>{isSessionComplete ? completeSummary : currentTitle ? `${currentTitle} · vídeo ${(activeIndex ?? 0) + 1} de ${queue.length}${remaining ? ` · ${remaining}× restante${remaining === 1 ? "" : "s"}` : ""}` : "Edite somente os vídeos que ainda não começaram."}</small>
        </span>
        <span className="queue-toggle-meta">{queue.length} vídeos <ChevronDown aria-hidden="true" size={16} /></span>
      </button>
    </div>
    <div aria-hidden={!isExpanded} className={`queue-content-wrapper${isExpanded ? " is-expanded" : ""}`} id="queue-content" inert={!isExpanded}>
      <div className="queue-content">
      <div className="queue-expanded-actions">
        {!isSessionComplete && <button className="queue-stop-button" type="button" onClick={onStop} title="Pedir confirmação para encerrar a playlist" aria-label="Encerrar playlist em execução"><Square aria-hidden="true" size={14} />Encerrar playlist</button>}
        {isLoggedIn && !isSavedPlaylist && <button className="icon-save-button" type="button" onClick={onSave} disabled={isSaving} aria-label="Salvar playlist em execução" title="Salvar playlist">
          <Save aria-hidden="true" size={18} />
        </button>}
      </div>
      {!isSessionComplete && <form className="queue-add-form" onSubmit={addToQueue} aria-label="Adicionar vídeo à fila">
        <label className="queue-add-source" htmlFor="queue-add-source">URL do vídeo<input id="queue-add-source" type="url" value={newSource} onChange={(event) => { setNewSource(normalizeVideoUrlInput(event.target.value)); setQueueMessage(null); }} required /></label>
        <label htmlFor="queue-add-count">Repetições<input id="queue-add-count" type="number" min="1" step="1" value={newRepetitions} onChange={(event) => setNewRepetitions(event.target.value)} required /></label>
        <button className="secondary-button" type="submit" disabled={!canAdd}><Plus aria-hidden="true" size={16} />Adicionar à fila</button>
      </form>}
      {queueMessage && <p className="field-help queue-feedback" role="status">{queueMessage}</p>}
      {saveMessage && <p className="field-help queue-save-message" role="status">{saveMessage}</p>}
      {isSessionComplete && <div className="queue-complete-summary" role="status">
        <span>{completeSummary}</span>
        <span>{queue.reduce((total, item) => total + item.repetitions - (item.skippedRepetitions ?? 0), 0)} repetições concluídas</span>
        <div>
          <button className="primary-button" type="button" onClick={onRestartSession}><Play aria-hidden="true" size={16} />Reproduzir novamente</button>
          {isLoggedIn && !isSavedPlaylist && <button className="secondary-button" type="button" onClick={onSave} disabled={isSaving}><Save aria-hidden="true" size={16} />Salvar playlist</button>}
          <button className="secondary-button" type="button" onClick={onStartNewPlaylist}><Plus aria-hidden="true" size={16} />Nova playlist</button>
        </div>
      </div>}
      {activeIndex !== null && !isSessionComplete && <p className="sr-only" role="status" aria-live="polite">Vídeo {activeIndex + 1} agora está tocando.</p>}
      {!isSessionComplete && <ol className="queue-active-list" aria-label="Vídeo atual e próximos vídeos">{visibleQueue.map((item, offset) => renderQueueItem(item, (activeIndex ?? 0) + offset))}</ol>}
      {completedQueue.length > 0 && <details className="queue-completed">
        <summary>Já reproduzidos <span>{completedQueue.length}</span></summary>
        <ol aria-label="Vídeos já reproduzidos">{completedQueue.map((item) => renderQueueItem(item, queue.findIndex((entry) => entry.id === item.id)))}</ol>
      </details>}
      {skippedQueue.length > 0 && <details className="queue-completed"><summary>Pulados por erro <span>{skippedQueue.length}</span></summary><ol aria-label="Vídeos pulados por erro">{skippedQueue.map((item) => renderQueueItem(item, queue.findIndex((entry) => entry.id === item.id)))}</ol></details>}
      </div>
    </div>
  </section>;
}
