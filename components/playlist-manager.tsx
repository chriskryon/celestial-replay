"use client";

import { ListMusic } from "lucide-react";

import { AudioLibrary } from "@/components/playlists/audio-library";
import { DeleteAudioDialog } from "@/components/playlists/delete-audio-dialog";
import { DeletePlaylistDialog } from "@/components/playlists/delete-playlist-dialog";
import { PlaylistEditor } from "@/components/playlists/playlist-editor";
import { PlaylistLibrary } from "@/components/playlists/playlist-library";
import { ShareDialog } from "@/components/playlists/share-dialog";
import type { Playlist } from "@/components/playlists/types";
import { Toast } from "@/components/toast";
import { useAudioLibrary } from "@/hooks/use-audio-library";
import { usePlaylistManager } from "@/hooks/use-playlist-manager";

export function PlaylistManager({ initialPlaylists }: { initialPlaylists: Playlist[] }) {
  const manager = usePlaylistManager(initialPlaylists);
  const audioLibrary = useAudioLibrary();

  return <section aria-label="Biblioteca de playlists" className="studio-shell account-shell">
      <div className="playlist-library">
        {manager.view === "library" ? <>
          <header className="library-heading"><span className="history-heading-icon"><ListMusic aria-hidden="true" size={22} /></span><div><h1>Suas playlists</h1><p>Encontre uma fila, comece a reproduzir ou abra para editar.</p></div></header>
          <PlaylistLibrary availableDomains={manager.availableDomains} domainFilter={manager.domainFilter} filteredPlaylists={manager.filteredPlaylists} onCreate={manager.create} onDomainChange={manager.setDomainFilter} onDuplicate={(playlist) => void manager.duplicatePlaylist(playlist)} onEdit={manager.edit} onSearchChange={manager.setSearch} onSortChange={manager.setSort} onToggleFavorite={(playlist) => void manager.toggleFavorite(playlist)} onVerify={(playlist) => void manager.verifyPlaylist(playlist)} playlists={manager.playlists} search={manager.search} selectedId={manager.selectedId} sort={manager.sort} verificationByPlaylist={manager.verificationByPlaylist} verifyingPlaylistId={manager.verifyingPlaylistId} />
        </> : <div className="playlist-editor-view">
          <PlaylistEditor inputMode={manager.inputMode} isSaving={manager.isSaving} isValid={manager.isValid} items={manager.items} name={manager.name} onAddItem={manager.addItem} onAddUploadedItem={manager.addUploadedItem} onBack={manager.showLibrary} onChangeMode={manager.changeInputMode} onDelete={() => manager.selected && manager.setDeleteTarget(manager.selected)} onDuplicateItem={manager.duplicateItem} onMoveItem={manager.moveItem} onNameChange={manager.setName} onRemoveItem={manager.removeItem} onReorderItems={manager.reorderItems} onSave={() => void manager.save()} onShare={() => manager.selected && manager.setShareTarget(manager.selected)} onSimpleInputChange={manager.setSimpleInput} onUpdateItem={manager.updateItem} selected={manager.selected} simpleInput={manager.simpleInput} verificationResults={manager.selected ? manager.verificationByPlaylist[manager.selected.id] ?? [] : []} />
          <AudioLibrary files={audioLibrary.files} isLoading={audioLibrary.isLoading} maxBytes={audioLibrary.maxBytes} maxFiles={audioLibrary.maxFiles} onDelete={audioLibrary.setDeleteTarget} onRename={(file, displayName) => void audioLibrary.rename(file, displayName)} onUse={manager.addUploadedItem} totalBytes={audioLibrary.totalBytes} />
        </div>}
        <Toast message={manager.message} tone={manager.message?.includes("não foi") || manager.message?.includes("Informe") ? "error" : "success"} />
        <Toast message={audioLibrary.message} tone={audioLibrary.message?.includes("não foi") ? "error" : "success"} />
        {manager.deleteTarget && <DeletePlaylistDialog onCancel={() => manager.setDeleteTarget(null)} onConfirm={() => void manager.remove(manager.deleteTarget!)} playlist={manager.deleteTarget} />}
        {manager.shareTarget && <ShareDialog isSharing={manager.isSharing} onCancel={() => manager.setShareTarget(null)} onDisable={() => void manager.unshare(manager.shareTarget!)} onEnable={() => void manager.share(manager.shareTarget!)} playlist={manager.shareTarget} />}
        {audioLibrary.deleteTarget && <DeleteAudioDialog file={audioLibrary.deleteTarget} onCancel={() => audioLibrary.setDeleteTarget(null)} onConfirm={() => void audioLibrary.remove(audioLibrary.deleteTarget!)} />}
      </div>
    </section>;
}
