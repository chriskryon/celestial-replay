"use client";

import { ListMusic } from "lucide-react";

import { DeletePlaylistDialog } from "@/components/playlists/delete-playlist-dialog";
import { PlaylistEditor } from "@/components/playlists/playlist-editor";
import { PlaylistLibrary } from "@/components/playlists/playlist-library";
import type { Playlist } from "@/components/playlists/types";
import { Toast } from "@/components/toast";
import { usePlaylistManager } from "@/hooks/use-playlist-manager";

export function PlaylistManager({ initialPlaylists }: { initialPlaylists: Playlist[] }) {
  const manager = usePlaylistManager(initialPlaylists);

  return <section className="studio-shell account-shell" aria-labelledby="playlist-library-title">
      <div className="playlist-library">
        <header className="library-heading"><span className="history-heading-icon"><ListMusic aria-hidden="true" size={22} /></span><div><h1 id="playlist-library-title">Suas playlists</h1><p>Crie, organize e ajuste as filas que você quer repetir.</p></div></header>
        <div className="library-grid">
          <PlaylistLibrary availableDomains={manager.availableDomains} domainFilter={manager.domainFilter} filteredPlaylists={manager.filteredPlaylists} onCreate={manager.create} onDomainChange={manager.setDomainFilter} onDuplicate={(playlist) => void manager.duplicatePlaylist(playlist)} onEdit={manager.edit} onSearchChange={manager.setSearch} onSortChange={manager.setSort} playlists={manager.playlists} search={manager.search} selectedId={manager.selectedId} sort={manager.sort} />
          <PlaylistEditor inputMode={manager.inputMode} isSaving={manager.isSaving} isValid={manager.isValid} items={manager.items} name={manager.name} onAddItem={manager.addItem} onChangeMode={manager.changeInputMode} onDelete={() => manager.selected && manager.setDeleteTarget(manager.selected)} onDuplicateItem={manager.duplicateItem} onMoveItem={manager.moveItem} onNameChange={manager.setName} onRemoveItem={manager.removeItem} onReorderItems={manager.reorderItems} onSave={() => void manager.save()} onSimpleInputChange={manager.setSimpleInput} onUpdateItem={manager.updateItem} selected={manager.selected} simpleInput={manager.simpleInput} />
        </div>
        <Toast message={manager.message} tone={manager.message?.includes("não foi") || manager.message?.includes("Informe") ? "error" : "success"} />
        {manager.deleteTarget && <DeletePlaylistDialog onCancel={() => manager.setDeleteTarget(null)} onConfirm={() => void manager.remove(manager.deleteTarget!)} playlist={manager.deleteTarget} />}
      </div>
    </section>;
}
