"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { AUDIO_MIME_EXTENSIONS } from "@/lib/media-url";
import { sanitizeUploadBaseName } from "@/lib/upload-display";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

async function fileSha256(file: File) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function useAudioUpload() {
  const session = authClient.useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<string | null> {
    const userId = session.data?.user?.id;
    if (!userId) { setError("Faça login para enviar áudio."); return null; }

    const extension = AUDIO_MIME_EXTENSIONS[file.type];
    if (!extension) { setError("Formato de áudio não suportado."); return null; }
    if (file.size > MAX_FILE_BYTES) { setError("O arquivo precisa ter até 25MB."); return null; }

    setIsUploading(true);
    setError(null);
    try {
      const name = sanitizeUploadBaseName(file.name);
      const hash = await fileSha256(file);
      const blob = await upload(`audio/${userId}/${hash}-${name}.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/audio",
        contentType: file.type,
      });
      // O Blob mantém o nome de arquivo estável para deduplicação; o nome que a
      // pessoa vê fica nos metadados e pode ser alterado sem reenviar o áudio.
      await fetch("/api/uploads/audio", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: blob.url, displayName: file.name.replace(/\.[^.]+$/, "") }),
      }).catch(() => undefined);
      return blob.url;
    } catch (uploadError) {
      setError(uploadError instanceof Error && uploadError.message ? uploadError.message : "Falha ao enviar o áudio. Tente novamente.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { error, isUploading, uploadFile };
}
