"use client";

import { useEffect, useState } from "react";

export type AudioFile = { url: string; pathname: string; size: number; uploadedAt: string; displayName: string | null };

export function useAudioLibrary() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [maxFiles, setMaxFiles] = useState(0);
  const [maxBytes, setMaxBytes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AudioFile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/uploads/audio")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!result) return;
        setFiles(result.files);
        setMaxFiles(result.maxFiles);
        setMaxBytes(result.maxBytes);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function remove(file: AudioFile) {
    const response = await fetch("/api/uploads/audio", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: file.url }),
    });
    if (!response.ok) return setMessage("Não foi possível apagar este áudio agora.");
    setFiles((current) => current.filter((item) => item.url !== file.url));
    setDeleteTarget(null);
    setMessage("Áudio apagado.");
  }

  async function rename(file: AudioFile, displayName: string) {
    const response = await fetch("/api/uploads/audio", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: file.url, displayName }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) return setMessage(result?.error ?? "Não foi possível renomear este áudio agora.");
    setFiles((current) => current.map((item) => item.url === file.url ? { ...item, displayName: result.audio.displayName } : item));
    setMessage("Nome do áudio atualizado.");
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return { deleteTarget, files, isLoading, maxBytes, maxFiles, message, remove, rename, setDeleteTarget, totalBytes };
}
