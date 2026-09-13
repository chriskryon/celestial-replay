"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { AUDIO_MIME_EXTENSIONS } from "@/lib/media-url";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

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
      const blob = await upload(`audio/${userId}/upload.${extension}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads/audio",
        contentType: file.type,
      });
      return blob.url;
    } catch {
      setError("Falha ao enviar o áudio. Tente novamente.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  return { error, isUploading, uploadFile };
}
