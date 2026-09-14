"use client";

import { HardDrive, Music, Trash2 } from "lucide-react";

import type { AudioFile } from "@/hooks/use-audio-library";
import { formatBytes } from "@/lib/formatters";

type AudioLibraryProps = {
  files: AudioFile[];
  isLoading: boolean;
  maxBytes: number;
  maxFiles: number;
  onDelete: (file: AudioFile) => void;
  totalBytes: number;
};

export function AudioLibrary({ files, isLoading, maxBytes, maxFiles, onDelete, totalBytes }: AudioLibraryProps) {
  if (isLoading || files.length === 0) return null;

  return (
    <section aria-labelledby="audio-library-title" className="library-editor audio-library">
      <header className="library-editor-heading">
        <div><h2 id="audio-library-title"><Music aria-hidden="true" size={17} /> Seus áudios enviados</h2><p>Usados em playlists. Apagar aqui pode quebrar playlists que ainda usam o arquivo.</p></div>
      </header>
      <p className="field-help audio-library-quota"><HardDrive aria-hidden="true" size={14} />{files.length} de {maxFiles} arquivos · {formatBytes(totalBytes)} de {formatBytes(maxBytes)}</p>
      <ul className="audio-library-list">
        {files.map((file) => (
          <li key={file.url}>
            <span className="audio-library-name">{file.pathname.split("/").pop()}</span>
            <span className="audio-library-size">{formatBytes(file.size)}</span>
            <button aria-label={`Apagar ${file.pathname.split("/").pop()}`} className="remove-row" onClick={() => onDelete(file)} type="button"><Trash2 aria-hidden="true" size={16} /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
