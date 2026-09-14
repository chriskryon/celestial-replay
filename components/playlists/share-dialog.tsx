"use client";

import { Copy, Share2 } from "lucide-react";
import { useState } from "react";

import type { Playlist } from "@/components/playlists/types";

type ShareDialogProps = {
  isSharing: boolean;
  onCancel: () => void;
  onDisable: () => void;
  onEnable: () => void;
  playlist: Playlist;
};

export function ShareDialog({ isSharing, onCancel, onDisable, onEnable, playlist }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/share/${playlist.id}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponível, usuário pode selecionar e copiar manualmente */ }
  };

  return (
    <div className="confirm-backdrop" role="presentation">
      <section aria-labelledby="share-title" aria-modal="true" className="confirm-dialog share-dialog" role="dialog">
        <h2 id="share-title">Compartilhar playlist</h2>
        {playlist.isPublic ? <>
          <p>Qualquer pessoa com o link abaixo pode ver e tocar “{playlist.name}”, sem precisar de conta.</p>
          <div className="share-link-row">
            <label className="sr-only" htmlFor="share-link-input">Link de compartilhamento</label>
            <input id="share-link-input" onFocus={(event) => event.target.select()} readOnly value={url} />
            <button className="secondary-button" onClick={() => void copyLink()} type="button"><Copy aria-hidden="true" size={15} />{copied ? "Copiado!" : "Copiar"}</button>
          </div>
          <div>
            <button className="secondary-button" onClick={onCancel} type="button">Fechar</button>
            <button className="danger-button" disabled={isSharing} onClick={onDisable} type="button">{isSharing ? "Parando…" : "Parar de compartilhar"}</button>
          </div>
        </> : <>
          <p>Gere um link público pra “{playlist.name}” — qualquer pessoa com o link poderá ver e tocar, sem conta.</p>
          <div>
            <button className="secondary-button" onClick={onCancel} type="button">Cancelar</button>
            <button className="primary-button" disabled={isSharing} onClick={onEnable} type="button"><Share2 aria-hidden="true" size={16} />{isSharing ? "Gerando…" : "Gerar link"}</button>
          </div>
        </>}
      </section>
    </div>
  );
}
