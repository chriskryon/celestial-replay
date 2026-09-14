"use client";

import { useEffect, useState } from "react";

export type AudioFile = { url: string; pathname: string; size: number; uploadedAt: string };

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

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  return { deleteTarget, files, isLoading, maxBytes, maxFiles, message, remove, setDeleteTarget, totalBytes };
}
