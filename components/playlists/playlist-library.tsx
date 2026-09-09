"use client";

import { Copy, ListFilter, ListMusic, Pencil, Plus, Search } from "lucide-react";

import type { Playlist } from "@/components/playlists/types";

type PlaylistLibraryProps = {
  availableDomains: string[];
  domainFilter: string;
  filteredPlaylists: Playlist[];
  onCreate: () => void;
  onDuplicate: (playlist: Playlist) => void;
  onEdit: (playlist: Playlist) => void;
  onSearchChange: (value: string) => void;
  onDomainChange: (value: string) => void;
  onSortChange: (value: "recent" | "name" | "size") => void;
  playlists: Playlist[];
  search: string;
  selectedId: string | null;
  sort: "recent" | "name" | "size";
};

export function PlaylistLibrary({ availableDomains, domainFilter, filteredPlaylists, onCreate, onDuplicate, onEdit, onSearchChange, onDomainChange, onSortChange, playlists, search, selectedId, sort }: PlaylistLibraryProps) {
  return (
    <aside aria-label="Playlists salvas" className="library-list">
      <button className="new-playlist" onClick={onCreate} type="button"><Plus aria-hidden="true" size={17} />Nova playlist</button>
      {playlists.length === 0 ? <EmptyLibrary onCreate={onCreate} /> : (
        <>
          <LibraryFilters
            availableDomains={availableDomains}
            domainFilter={domainFilter}
            onDomainChange={onDomainChange}
            onSearchChange={onSearchChange}
            onSortChange={onSortChange}
            search={search}
            sort={sort}
          />
          {filteredPlaylists.length === 0 ? <p className="library-no-results">Nenhuma playlist encontrada.</p> : (
            <ul>
              {filteredPlaylists.map((playlist) => (
                <li key={playlist.id}>
                  <div className={playlist.id === selectedId ? "library-playlist is-selected" : "library-playlist"}>
                    <button onClick={() => onEdit(playlist)} type="button">
                      <span><strong>{playlist.name}</strong><small>{playlist.items.length} {playlist.items.length === 1 ? "vídeo" : "vídeos"}</small></span>
                      <Pencil aria-hidden="true" size={15} />
                    </button>
                    <button aria-label={`Duplicar ${playlist.name}`} className="library-duplicate" onClick={() => onDuplicate(playlist)} title="Duplicar playlist" type="button"><Copy aria-hidden="true" size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="library-empty library-empty-playlists">
      <span className="library-empty-icon"><ListMusic aria-hidden="true" size={20} /></span>
      <div><h3>Sua biblioteca está pronta</h3><p>Monte sua primeira fila no editor e ela ficará disponível aqui.</p></div>
      <button className="secondary-button" onClick={onCreate} type="button">Montar playlist</button>
    </div>
  );
}

type LibraryFiltersProps = Pick<PlaylistLibraryProps, "availableDomains" | "domainFilter" | "onDomainChange" | "onSearchChange" | "onSortChange" | "search" | "sort">;

function LibraryFilters({ availableDomains, domainFilter, onDomainChange, onSearchChange, onSortChange, search, sort }: LibraryFiltersProps) {
  return (
    <div className="library-filters">
      <label className="sr-only" htmlFor="playlist-search">Buscar playlist</label>
      <span><Search aria-hidden="true" size={15} /><input id="playlist-search" onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar" value={search} /></span>
      <label className="sr-only" htmlFor="playlist-domain">Filtrar por origem</label>
      <span><ListFilter aria-hidden="true" size={15} /><select id="playlist-domain" onChange={(event) => onDomainChange(event.target.value)} value={domainFilter}><option value="todos">Todas as origens</option>{availableDomains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}</select></span>
      <label className="sr-only" htmlFor="playlist-sort">Ordenar playlists</label>
      <span><ListFilter aria-hidden="true" size={15} /><select id="playlist-sort" onChange={(event) => onSortChange(event.target.value as PlaylistLibraryProps["sort"])} value={sort}><option value="recent">Mais recentes</option><option value="name">Nome</option><option value="size">Mais vídeos</option></select></span>
    </div>
  );
}
