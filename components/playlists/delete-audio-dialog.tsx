import type { AudioFile } from "@/hooks/use-audio-library";

export function DeleteAudioDialog({ file, onCancel, onConfirm }: { file: AudioFile; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="confirm-backdrop" role="presentation">
      <section aria-labelledby="delete-audio-title" aria-modal="true" className="confirm-dialog" role="alertdialog">
        <h2 id="delete-audio-title">Apagar áudio?</h2>
        <p>“{file.pathname.split("/").pop()}” será apagado definitivamente. Playlists que ainda usam esse arquivo vão parar de tocá-lo.</p>
        <div>
          <button className="secondary-button" onClick={onCancel} type="button">Cancelar</button>
          <button className="danger-button" onClick={onConfirm} type="button">Apagar áudio</button>
        </div>
      </section>
    </div>
  );
}
