"use client";

import { type ChangeEvent, useRef } from "react";
import { Upload } from "lucide-react";

import { useAudioUpload } from "@/hooks/use-audio-upload";

type AudioUploadButtonProps = {
  onUploaded: (url: string, displayName: string | null) => void;
};

export function AudioUploadButton({ onUploaded }: AudioUploadButtonProps) {
  const { error, isUploading, uploadFile } = useAudioUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = await uploadFile(file);
    if (url) onUploaded(url, file.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <span className="audio-upload">
      <input ref={inputRef} type="file" accept="audio/*" hidden onChange={(event) => void handleChange(event)} disabled={isUploading} />
      <button className="add-row" type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
        <Upload aria-hidden="true" size={18} />{isUploading ? "Enviando…" : "Enviar áudio"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </span>
  );
}
