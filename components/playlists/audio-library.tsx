"use client";

import { Check, HardDrive, Music, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import type { AudioFile } from "@/hooks/use-audio-library";
import { formatBytes } from "@/lib/formatters";
import { uploadDisplayNameFromPath } from "@/lib/upload-display";

type AudioLibraryProps = {
  files: AudioFile[];
  isLoading: boolean;
  maxBytes: number;
  maxFiles: number;
  onDelete: (file: AudioFile) => void;
  onRename: (file: AudioFile, displayName: string) => void;
  onUse: (file: AudioFile) => void;
  totalBytes: number;
};

export function AudioLibrary({ files, isLoading, maxBytes, maxFiles, onDelete, onRename, onUse, totalBytes }: AudioLibraryProps) {
  if (isLoading || files.length === 0) return null;

  return (
    <section aria-labelledby="audio-library-title" className="library-editor audio-library">
      <header className="library-editor-heading">
        <div><h2 id="audio-library-title"><Music aria-hidden="true" size={17} /> Seus áudios enviados</h2><p>Usados em playlists. Apagar aqui pode quebrar playlists que ainda usam o arquivo.</p></div>
      </header>
      <p className="field-help audio-library-quota"><HardDrive aria-hidden="true" size={14} />{files.length} de {maxFiles} arquivos · {formatBytes(totalBytes)} de {formatBytes(maxBytes)}</p>
      <ul className="audio-library-list">
        {files.map((file) => <AudioLibraryItem file={file} key={file.url} onDelete={onDelete} onRename={onRename} onUse={onUse} />)}
      </ul>
    </section>
  );
}

function AudioLibraryItem({ file, onDelete, onRename, onUse }: Pick<AudioLibraryProps, "onDelete" | "onRename" | "onUse"> & { file: AudioFile }) {
  const fallbackName = uploadDisplayNameFromPath(file.pathname);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(file.displayName ?? fallbackName);
  const label = file.displayName ?? fallbackName;
  const save = () => {
    const nextName = name.trim();
    if (!nextName) return;
    onRename(file, nextName);
    setIsRenaming(false);
  };
  return <li>
    {isRenaming ? <><label className="sr-only" htmlFor={`audio-name-${file.url}`}>Nome do áudio</label><input id={`audio-name-${file.url}`} maxLength={80} onChange={(event) => setName(event.target.value)} value={name} /><button aria-label="Salvar nome" className="row-action-button" onClick={save} title="Salvar nome" type="button"><Check aria-hidden="true" size={15} /></button><button aria-label="Cancelar alteração do nome" className="row-action-button" onClick={() => { setName(label); setIsRenaming(false); }} title="Cancelar" type="button"><X aria-hidden="true" size={15} /></button></> : <><span className="audio-library-name">{label}</span><span className="audio-library-size">{formatBytes(file.size)}</span><button aria-label={`Renomear ${label}`} className="row-action-button" onClick={() => setIsRenaming(true)} title="Renomear" type="button"><Pencil aria-hidden="true" size={15} /></button><button aria-label={`Usar ${label} na playlist`} className="add-row audio-use-button" onClick={() => onUse(file)} type="button"><Plus aria-hidden="true" size={15} />Usar</button><button aria-label={`Apagar ${label}`} className="remove-row" onClick={() => onDelete(file)} type="button"><Trash2 aria-hidden="true" size={16} /></button></>}
  </li>;
}
