import type { Playlist } from "@/components/playlists/types";

export function DeletePlaylistDialog({ onCancel, onConfirm, playlist }: { onCancel: () => void; onConfirm: () => void; playlist: Playlist }) {
  return (
    <div className="confirm-backdrop" role="presentation">
      <section aria-labelledby="delete-title" aria-modal="true" className="confirm-dialog" role="alertdialog">
        <h2 id="delete-title">Apagar playlist?</h2>
        <p>“{playlist.name}” será apagada definitivamente.</p>
        <div>
          <button className="secondary-button" onClick={onCancel} type="button">Cancelar</button>
          <button className="danger-button" onClick={onConfirm} type="button">Apagar playlist</button>
        </div>
      </section>
    </div>
  );
}
