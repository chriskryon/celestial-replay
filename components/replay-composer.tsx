import type { FormEvent } from "react";
import { CheckCircle2, ListPlus, Play, Plus, Save, Trash2 } from "lucide-react";

import { canPlaySrc } from "@/components/react-player-client";
import { type PlaylistDraft, type SavedPlaylist, parseSingleReplay } from "@/lib/replay-playlist";

type ReplayMode = "single" | "playlist";
type PlaylistInputMode = "simple" | "advanced";

type ReplayComposerProps = {
  canSubmitPlaylist: boolean;
  canSubmitSingle: boolean;
  drafts: PlaylistDraft[];
  error: string | null;
  isEditingQueue: boolean;
  isLoggedIn: boolean;
  isSavingPlaylist: boolean;
  mode: ReplayMode;
  onAddDraft: () => void;
  onLoadSavedPlaylist: (playlist: SavedPlaylist) => void;
  onOpenSaveDialog: () => void;
  onPlaylistInputModeChange: (mode: PlaylistInputMode) => void;
  onRepetitionsChange: (value: string) => void;
  onRemoveDraft: (id: string) => void;
  onSimplePlaylistChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onStart: (event: FormEvent<HTMLFormElement>) => void;
  onStartNewPlaylist: () => void;
  onUpdateDraft: (id: string, field: "src" | "repetitions", value: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  playbackRate: number;
  playlistHint: string | null;
  playlistInputMode: PlaylistInputMode;
  playlistSaveMessage: string | null;
  previewAvailable: boolean;
  repetitions: string;
  savedPlaylists: SavedPlaylist[];
  simplePlaylist: string;
  simplePlaylistItemsCount: number;
  simplePlaylistLineCount: number;
  singleHint: string | null;
  source: string;
  invalidSimpleLine: number;
};

export function ReplayComposer({
  canSubmitPlaylist,
  canSubmitSingle,
  drafts,
  error,
  isEditingQueue,
  isLoggedIn,
  isSavingPlaylist,
  mode,
  onAddDraft,
  onLoadSavedPlaylist,
  onOpenSaveDialog,
  onPlaylistInputModeChange,
  onRepetitionsChange,
  onRemoveDraft,
  onSimplePlaylistChange,
  onSourceChange,
  onStart,
  onStartNewPlaylist,
  onUpdateDraft,
  onPlaybackRateChange,
  playbackRate,
  playlistHint,
  playlistInputMode,
  playlistSaveMessage,
  previewAvailable,
  repetitions,
  savedPlaylists,
  simplePlaylist,
  simplePlaylistItemsCount,
  simplePlaylistLineCount,
  singleHint,
  source,
  invalidSimpleLine,
}: ReplayComposerProps) {
  const formHint = mode === "single" ? singleHint : playlistHint;
  const advancedPlaylistRepetitions = drafts.reduce((total, draft) => total + Math.max(0, Number(draft.repetitions) || 0), 0);

  return <form className={`control-surface ${mode === "playlist" ? "playlist-form" : ""}`} onSubmit={onStart}>
    {mode === "single" ? <>
      <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Configurar repetição</h2></div>
      <label htmlFor="source">URL do vídeo</label>
      <input id="source" value={source} onChange={(event) => onSourceChange(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." inputMode="url" autoComplete="url" />
      {canSubmitSingle && <span className="source-validity" role="status"><CheckCircle2 aria-hidden="true" size={14} />Fonte suportada</span>}
      <label htmlFor="repetitions">Repetições</label>
      <input id="repetitions" type="number" min="1" step="1" value={repetitions} onChange={(event) => onRepetitionsChange(event.target.value)} />
      <p className="field-help">Ex.: 3 reproduz o mesmo vídeo três vezes completas.</p>
    </> : isEditingQueue ? <div className="playlist-running-note">
      <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Playlist em andamento</h2></div>
      <p>Os próximos vídeos podem ser editados logo abaixo.</p>
      <button className="add-row" type="button" onClick={onStartNewPlaylist}>Nova playlist</button>
    </div> : <>
      <div className="playlist-heading">
        <div className="form-heading"><ListPlus aria-hidden="true" size={20} /><h2>Monte sua playlist</h2></div>
        <p>Escolha a forma que for mais confortável. A playlist só começa quando tudo estiver válido.</p>
      </div>
      <div className="playlist-input-mode" role="tablist" aria-label="Forma de montar a playlist">
        <button className={playlistInputMode === "simple" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={playlistInputMode === "simple"} onClick={() => onPlaylistInputModeChange("simple")}>Simples: linhas</button>
        <button className={playlistInputMode === "advanced" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={playlistInputMode === "advanced"} onClick={() => onPlaylistInputModeChange("advanced")}>Avançado: campos</button>
      </div>
      {savedPlaylists.length > 0 && <section className="saved-playlists" aria-labelledby="saved-playlists-title">
        <h3 id="saved-playlists-title">Minhas playlists</h3>
        <div>{savedPlaylists.map((playlist) => <button className="saved-playlist" type="button" key={playlist.id} onClick={() => onLoadSavedPlaylist(playlist)}>{playlist.name}<span>{playlist.items.length} {playlist.items.length === 1 ? "vídeo" : "vídeos"}</span></button>)}</div>
      </section>}
      {playlistInputMode === "simple" ? <div className="simple-playlist-input">
        <label htmlFor="simple-playlist">Vídeos e repetições</label>
        <textarea id="simple-playlist" value={simplePlaylist} onChange={(event) => onSimplePlaylistChange(event.target.value)} placeholder={"https://youtube.com/watch?v=exemplo;3\nhttps://vimeo.com/exemplo;1"} spellCheck="false" />
        <p>Uma linha por vídeo: <code>link;quantidade</code>.{simplePlaylistLineCount > 0 && <span className="playlist-summary">{simplePlaylistLineCount} {simplePlaylistLineCount === 1 ? "vídeo" : "vídeos"} · {simplePlaylistItemsCount} repetições</span>}</p>
        {invalidSimpleLine >= 0 && <p className="field-error" role="alert">Revise a linha {invalidSimpleLine + 1}: use <code>link;quantidade</code>.</p>}
      </div> : <div className="playlist-editor" aria-label="Vídeos da playlist">
        {drafts.map((draft, index) => {
          const touched = draft.src.trim() !== "" || draft.repetitions !== "1";
          const rowInvalid = touched && !parseSingleReplay(draft.src, draft.repetitions, canPlaySrc);
          return <div className="playlist-row" key={draft.id}>
            <span className="row-number" aria-hidden="true">{index + 1}</span>
            <label className="sr-only" htmlFor={`playlist-url-${draft.id}`}>URL do vídeo {index + 1}</label>
            <input id={`playlist-url-${draft.id}`} value={draft.src} onChange={(event) => onUpdateDraft(draft.id, "src", event.target.value)} placeholder="Cole a URL do vídeo" inputMode="url" autoComplete="url" aria-invalid={rowInvalid} />
            <label className="sr-only" htmlFor={`playlist-count-${draft.id}`}>Repetições do vídeo {index + 1}</label>
            <input id={`playlist-count-${draft.id}`} type="number" min="1" step="1" value={draft.repetitions} onChange={(event) => onUpdateDraft(draft.id, "repetitions", event.target.value)} aria-invalid={rowInvalid} />
            {drafts.length > 1 && <button className="remove-row" type="button" onClick={() => onRemoveDraft(draft.id)} aria-label={`Remover vídeo ${index + 1}`}><Trash2 aria-hidden="true" size={18} /></button>}
          </div>;
        })}
      </div>}
      {playlistInputMode === "advanced" && <div className="playlist-editor-toolbar"><span className="playlist-form-summary" aria-live="polite">{drafts.length} {drafts.length === 1 ? "vídeo" : "vídeos"} · {advancedPlaylistRepetitions} {advancedPlaylistRepetitions === 1 ? "execução" : "execuções"}</span><button className="add-row" type="button" onClick={onAddDraft}><Plus aria-hidden="true" size={18} />Adicionar outro vídeo</button></div>}
      {playlistSaveMessage && <p className="field-help playlist-save-message" role="status">{playlistSaveMessage}</p>}
    </>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {!isEditingQueue && mode === "playlist" && <div className="playlist-actions">
      {isLoggedIn && <button className="icon-save-button" type="button" onClick={onOpenSaveDialog} disabled={!canSubmitPlaylist || isSavingPlaylist} aria-label="Salvar playlist" title="Salvar playlist"><Save aria-hidden="true" size={18} /></button>}
      {previewAvailable && <div className="control-group preview-rate" role="toolbar" aria-label="Velocidade inicial"><span>Velocidade</span>{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-pressed={playbackRate === rate} onClick={() => onPlaybackRateChange(rate)} title={`Começar em ${rate}x`}>{rate}x</button>)}</div>}
      <button className="primary-button celestial-start-button" type="submit" disabled={!canSubmitPlaylist}><Play aria-hidden="true" size={18} />Iniciar playlist</button>
    </div>}
    {!isEditingQueue && mode === "single" && <button className={`primary-button celestial-start-button ${canSubmitSingle ? "is-ready" : ""}`} type="submit" disabled={!canSubmitSingle}><Play aria-hidden="true" size={18} />Iniciar</button>}
    {!isEditingQueue && formHint && <p className="field-help" role="status">{formHint}</p>}
    {!isEditingQueue && previewAvailable && mode === "single" && <div className="control-group preview-rate" role="toolbar" aria-label="Velocidade inicial"><span>Velocidade</span>{[1, 1.5, 2].map((rate) => <button key={rate} className={playbackRate === rate ? "mode-button is-selected" : "mode-button"} type="button" aria-pressed={playbackRate === rate} onClick={() => onPlaybackRateChange(rate)} title={`Começar em ${rate}x`}>{rate}x</button>)}</div>}
  </form>;
}
