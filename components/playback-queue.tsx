import { ChevronDown, ExternalLink, Save, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { canPlaySrc } from "@/components/react-player-client";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { isPlayableItem, type VideoItem } from "@/lib/replay-playlist";

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
  onRemoveFutureItem: (id: string) => void;
  onSave: () => void;
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
  onRemoveFutureItem,
  onSave,
  onStop,
  onUpdateUpcomingItem,
  queue,
  remaining,
  saveMessage,
  visibleQueue,
}: PlaybackQueueProps) {
  const currentItemRef = useRef<HTMLLIElement | null>(null);
  const [recentIndex, setRecentIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const currentItem = isSessionComplete || activeIndex === null ? null : queue[activeIndex] ?? null;
  const currentMetadata = currentItem ? metadata[currentItem.src] : null;
  const currentTitle = currentItem ? currentMetadata?.title ?? (() => {
    try { return new URL(currentItem.src).hostname.replace(/^www\./, ""); } catch { return "Vídeo atual"; }
  })() : null;

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (activeIndex === null) return;
    setRecentIndex(activeIndex);
    const timeout = window.setTimeout(() => setRecentIndex(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  const renderQueueItem = (item: VideoItem, index: number) => {
    const isCurrent = index === activeIndex;
    const isFuture = !isSessionComplete && activeIndex !== null && index > activeIndex;
    const state = isSessionComplete
      ? "Concluído"
      : isCurrent
      ? error
        ? "Não reproduzível"
        : hasPlaybackStarted
          ? isPlaying ? "Tocando agora" : "Pausado"
          : "Iniciando"
      : index < (activeIndex ?? 0) ? "Concluído" : "A seguir";
    const itemMetadata = metadata[item.src];
    const displayTitle = itemMetadata?.title ?? (() => {
      try { return new URL(item.src).hostname.replace(/^www\./, ""); } catch { return item.src; }
    })();

    return (
      <li ref={isCurrent ? currentItemRef : undefined} className={`queue-item${isCurrent ? " is-current" : ""}${recentIndex === index ? " is-recent" : ""}`} key={item.id}>
        <span className="queue-state">
          <b>{index + 1}</b>
          <small>{state}</small>
        </span>
        {isFuture ? <>
          <label className="sr-only" htmlFor={`queue-url-${item.id}`}>URL do vídeo {index + 1}</label>
          <input
            id={`queue-url-${item.id}`}
            value={item.src}
            onChange={(event) => onUpdateUpcomingItem(item.id, "src", event.target.value)}
            aria-invalid={!isPlayableMediaUrl(item.src.trim())}
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
            {itemMetadata?.authorName && <small>{itemMetadata.authorName}</small>}
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
          <strong id="queue-title">{isSessionComplete ? "Playlist concluída" : "Playlist em execução"}</strong>
          <small key={isSessionComplete ? "complete" : activeIndex ?? "idle"}>{isSessionComplete ? `${queue.length} ${queue.length === 1 ? "vídeo concluído" : "vídeos concluídos"}` : currentTitle ? `${currentTitle} · vídeo ${(activeIndex ?? 0) + 1} de ${queue.length}${remaining ? ` · ${remaining}× restante${remaining === 1 ? "" : "s"}` : ""}` : "Edite somente os vídeos que ainda não começaram."}</small>
        </span>
        <span className="queue-toggle-meta">{queue.length} vídeos <ChevronDown aria-hidden="true" size={16} /></span>
      </button>
      <div className="queue-title-actions">
        {!isSessionComplete && <button className="queue-stop-button" type="button" onClick={onStop} title="Pedir confirmação para encerrar a playlist" aria-label="Encerrar playlist em execução"><Square aria-hidden="true" size={14} />Encerrar</button>}
        {isLoggedIn && !isSavedPlaylist && <button className="icon-save-button" type="button" onClick={onSave} disabled={isSaving} aria-label="Salvar playlist em execução" title="Salvar playlist">
          <Save aria-hidden="true" size={18} />
        </button>}
      </div>
    </div>
    <div aria-hidden={!isExpanded} className={`queue-content-wrapper${isExpanded ? " is-expanded" : ""}`} id="queue-content" inert={!isExpanded}>
      <div className="queue-content">
      {saveMessage && <p className="field-help queue-save-message" role="status">{saveMessage}</p>}
      {activeIndex !== null && !isSessionComplete && <p className="sr-only" role="status" aria-live="polite">Vídeo {activeIndex + 1} agora está tocando.</p>}
      {!isSessionComplete && <ol className="queue-active-list" aria-label="Vídeo atual e próximos vídeos">{visibleQueue.map((item, offset) => renderQueueItem(item, (activeIndex ?? 0) + offset))}</ol>}
      {completedQueue.length > 0 && <details className="queue-completed">
        <summary>Já reproduzidos <span>{completedQueue.length}</span></summary>
        <ol aria-label="Vídeos já reproduzidos">{completedQueue.map((item, index) => renderQueueItem(item, index))}</ol>
      </details>}
      </div>
    </div>
  </section>;
}
