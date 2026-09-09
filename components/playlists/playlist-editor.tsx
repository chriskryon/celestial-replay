"use client";

import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import type { DraftItem, Playlist, PlaylistInputMode } from "@/components/playlists/types";

type PlaylistEditorProps = {
  inputMode: PlaylistInputMode;
  isSaving: boolean;
  isValid: boolean;
  items: DraftItem[];
  name: string;
  onAddItem: () => void;
  onChangeMode: (mode: PlaylistInputMode) => void;
  onDelete: () => void;
  onDuplicateItem: (item: DraftItem) => void;
  onMoveItem: (id: string, direction: -1 | 1) => void;
  onNameChange: (value: string) => void;
  onRemoveItem: (id: string) => void;
  onReorderItems: (sourceId: string, targetId: string) => void;
  onSave: () => void;
  onSimpleInputChange: (value: string) => void;
  onUpdateItem: (id: string, field: "url" | "repetitions", value: string) => void;
  selected: Playlist | null;
  simpleInput: string;
};

export function PlaylistEditor(props: PlaylistEditorProps) {
  const { inputMode, isSaving, isValid, items, name, onAddItem, onChangeMode, onDelete, onDuplicateItem, onMoveItem, onNameChange, onRemoveItem, onReorderItems, onSave, onSimpleInputChange, onUpdateItem, selected, simpleInput } = props;
  return (
    <section aria-labelledby="editor-title" className="library-editor">
      <header className="library-editor-heading">
        <div><h2 id="editor-title">{selected ? "Editar playlist" : "Nova playlist"}</h2><p>{selected ? "As mudanças substituem a versão salva." : "Adicione um ou mais vídeos para criar sua fila."}</p></div>
        {selected && <button aria-label={`Apagar ${selected.name}`} className="icon-danger" onClick={onDelete} type="button"><Trash2 aria-hidden="true" size={17} /></button>}
      </header>

      <label htmlFor="library-playlist-name">Nome da playlist</label>
      <input id="library-playlist-name" maxLength={80} onChange={(event) => onNameChange(event.target.value)} value={name} />
      <PlaylistInputModePicker inputMode={inputMode} onChange={onChangeMode} />

      {inputMode === "simple" ? (
        <SimplePlaylistInput onChange={onSimpleInputChange} value={simpleInput} />
      ) : (
        <AdvancedPlaylistInput
          items={items}
          onAddItem={onAddItem}
          onDuplicateItem={onDuplicateItem}
          onMoveItem={onMoveItem}
          onRemoveItem={onRemoveItem}
          onReorderItems={onReorderItems}
          onUpdateItem={onUpdateItem}
        />
      )}

      <button className="primary-button" disabled={!isValid || isSaving} onClick={onSave} type="button">
        <Save aria-hidden="true" size={17} />{isSaving ? "Salvando…" : selected ? "Salvar alterações" : "Criar playlist"}
      </button>
    </section>
  );
}

function PlaylistInputModePicker({ inputMode, onChange }: { inputMode: PlaylistInputMode; onChange: (mode: PlaylistInputMode) => void }) {
  return (
    <div aria-label="Forma de montar a playlist" className="playlist-input-mode" role="tablist">
      <button aria-selected={inputMode === "simple"} className={inputMode === "simple" ? "mode-button is-selected" : "mode-button"} onClick={() => onChange("simple")} role="tab" type="button">Simples: linhas</button>
      <button aria-selected={inputMode === "advanced"} className={inputMode === "advanced" ? "mode-button is-selected" : "mode-button"} onClick={() => onChange("advanced")} role="tab" type="button">Avançado: campos</button>
    </div>
  );
}

function SimplePlaylistInput({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <div className="simple-playlist-input">
      <label htmlFor="library-simple-playlist">Vídeos e repetições</label>
      <textarea id="library-simple-playlist" onChange={(event) => onChange(event.target.value)} placeholder={"https://youtube.com/watch?v=exemplo;3\nhttps://vimeo.com/exemplo;1"} spellCheck="false" value={value} />
      <p>Uma linha por vídeo: <code>link;quantidade</code>.</p>
    </div>
  );
}

type AdvancedPlaylistInputProps = Pick<PlaylistEditorProps, "items" | "onAddItem" | "onDuplicateItem" | "onMoveItem" | "onRemoveItem" | "onReorderItems" | "onUpdateItem">;

function AdvancedPlaylistInput({ items, onAddItem, onDuplicateItem, onMoveItem, onRemoveItem, onReorderItems, onUpdateItem }: AdvancedPlaylistInputProps) {
  return (
    <>
      <div aria-label="Vídeos da playlist" className="library-items">
        {items.map((item, index) => <PlaylistItemEditor item={item} index={index} key={item.id} onDuplicate={onDuplicateItem} onMove={onMoveItem} onRemove={onRemoveItem} onReorder={onReorderItems} onUpdate={onUpdateItem} total={items.length} />)}
      </div>
      <button className="add-row" onClick={onAddItem} type="button"><Plus aria-hidden="true" size={17} />Adicionar vídeo</button>
    </>
  );
}

type PlaylistItemEditorProps = {
  index: number;
  item: DraftItem;
  onDuplicate: (item: DraftItem) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onUpdate: (id: string, field: "url" | "repetitions", value: string) => void;
  total: number;
};

function PlaylistItemEditor({ index, item, onDuplicate, onMove, onRemove, onReorder, onUpdate, total }: PlaylistItemEditorProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  return (
    <div className="playlist-row" draggable onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedItemId(item.id)} onDrop={() => { if (draggedItemId && draggedItemId !== item.id) onReorder(draggedItemId, item.id); setDraggedItemId(null); }}>
      <span aria-hidden="true" className="row-number">{index + 1}</span>
      <button aria-label={`Arraste ou mova o vídeo ${index + 1}`} className="drag-handle" type="button"><GripVertical aria-hidden="true" size={16} /></button>
      <label className="sr-only" htmlFor={`library-url-${item.id}`}>URL do vídeo {index + 1}</label>
      <input autoComplete="url" id={`library-url-${item.id}`} inputMode="url" onChange={(event) => onUpdate(item.id, "url", event.target.value)} placeholder="Cole a URL do vídeo" value={item.url} />
      <label className="sr-only" htmlFor={`library-repetitions-${item.id}`}>Repetições do vídeo {index + 1}</label>
      <input id={`library-repetitions-${item.id}`} min="1" onChange={(event) => onUpdate(item.id, "repetitions", event.target.value)} step="1" type="number" value={item.repetitions} />
      <div className="row-actions">
        <button aria-label={`Mover vídeo ${index + 1} para cima`} disabled={index === 0} onClick={() => onMove(item.id, -1)} type="button"><ChevronUp aria-hidden="true" size={15} /></button>
        <button aria-label={`Mover vídeo ${index + 1} para baixo`} disabled={index === total - 1} onClick={() => onMove(item.id, 1)} type="button"><ChevronDown aria-hidden="true" size={15} /></button>
        <button aria-label={`Duplicar vídeo ${index + 1}`} onClick={() => onDuplicate(item)} type="button"><Copy aria-hidden="true" size={15} /></button>
        {total > 1 && <button aria-label={`Remover vídeo ${index + 1}`} className="remove-row" onClick={() => onRemove(item.id)} type="button"><Trash2 aria-hidden="true" size={17} /></button>}
      </div>
    </div>
  );
}
