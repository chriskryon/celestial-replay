"use client";

import Link from "next/link";
import { CircleAlert, Copy, Heart, ListFilter, ListMusic, LoaderCircle, Pencil, Play, Plus, ScanSearch, Search, ShieldCheck } from "lucide-react";

import type { Playlist } from "@/components/playlists/types";
import { sourceDomain } from "@/lib/playlist-draft";
import type { PlaylistVerificationItem } from "@/lib/playlist-verification";

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
  onToggleFavorite: (playlist: Playlist) => void;
  onVerify: (playlist: Playlist) => void;
  playlists: Playlist[];
  search: string;
  selectedId: string | null;
  sort: "recent" | "name" | "size";
  verificationByPlaylist: Record<string, PlaylistVerificationItem[]>;
  verifyingPlaylistId: string | null;
};

export function PlaylistLibrary({ availableDomains, domainFilter, filteredPlaylists, onCreate, onDuplicate, onEdit, onSearchChange, onDomainChange, onSortChange, onToggleFavorite, onVerify, playlists, search, selectedId, sort, verificationByPlaylist, verifyingPlaylistId }: PlaylistLibraryProps) {
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
                    {(() => {
                      const verification = playlistVerification(playlist, verificationByPlaylist[playlist.id]);
                      const isVerifying = verifyingPlaylistId === playlist.id;
                      return <>
                    <button onClick={() => onEdit(playlist)} type="button">
                      <span><strong>{playlist.name}</strong><small>{playlistSummary(playlist)}</small><small className="library-playlist-domain">{playlistDomains(playlist)} · {playlistUpdatedAt(playlist.updatedAt)}</small><VerificationSummary verification={verification} /></span>
                      <Pencil aria-hidden="true" size={15} />
                    </button>
                    <button aria-label={`Verificar vídeos de ${playlist.name}`} className="library-verify" disabled={isVerifying} onClick={() => onVerify(playlist)} title="Verificar vídeos" type="button"><ScanSearch aria-hidden="true" size={15} /></button>
                    <Link aria-label={`Reproduzir ${playlist.name}`} className="library-play" href={`/?playlistId=${playlist.id}&autoplay=1`} title="Reproduzir playlist"><Play aria-hidden="true" size={15} /></Link>
                    <button aria-label={playlist.isFavorite ? `Remover ${playlist.name} dos favoritos` : `Favoritar ${playlist.name}`} aria-pressed={playlist.isFavorite} className={playlist.isFavorite ? "library-favorite is-active" : "library-favorite"} onClick={() => onToggleFavorite(playlist)} title={playlist.isFavorite ? "Remover dos favoritos" : "Favoritar"} type="button"><Heart aria-hidden="true" size={15} /></button>
                    <button aria-label={`Duplicar ${playlist.name}`} className="library-duplicate" onClick={() => onDuplicate(playlist)} title="Duplicar playlist" type="button"><Copy aria-hidden="true" size={15} /></button>
                      </>;
                    })()}
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

function playlistVerification(playlist: Playlist, results: PlaylistVerificationItem[] | undefined) {
  const current = results?.filter((result) => playlist.items.some((item) => item.id === result.id && item.url === result.source)) ?? [];
  if (current.length !== playlist.items.length) return { status: "idle" as const, count: 0 };
  if (current.some((result) => result.status === "checking")) return { status: "checking" as const, count: 0 };
  const unavailable = current.filter((result) => result.status === "unavailable").length;
  if (unavailable > 0) return { status: "unavailable" as const, count: unavailable };
  const ready = current.filter((result) => result.status === "ready").length;
  return ready === current.length ? { status: "ready" as const, count: ready } : { status: "unconfirmed" as const, count: current.length - ready };
}

function VerificationSummary({ verification }: { verification: ReturnType<typeof playlistVerification> }) {
  if (verification.status === "idle") return <small className="library-verification">Ainda não verificada</small>;
  if (verification.status === "checking") return <small className="library-verification is-checking"><LoaderCircle aria-hidden="true" size={12} />Verificando vídeos</small>;
  if (verification.status === "unavailable") return <small className="library-verification is-unavailable"><CircleAlert aria-hidden="true" size={12} />{verification.count} {verification.count === 1 ? "vídeo para revisar" : "vídeos para revisar"}</small>;
  if (verification.status === "ready") return <small className="library-verification is-ready"><ShieldCheck aria-hidden="true" size={12} />{verification.count} {verification.count === 1 ? "vídeo pronto" : "vídeos prontos"}</small>;
  return <small className="library-verification">{verification.count} {verification.count === 1 ? "resultado não confirmado" : "resultados não confirmados"}</small>;
}

function playlistSummary(playlist: Playlist) {
  const repetitions = playlist.items.reduce((total, item) => total + item.repetitions, 0);
  return `${playlist.items.length} ${playlist.items.length === 1 ? "vídeo" : "vídeos"} · ${repetitions} ${repetitions === 1 ? "execução" : "execuções"}`;
}

function playlistDomains(playlist: Playlist) {
  const domains = Array.from(new Set(playlist.items.map((item) => sourceDomain(item.url))));
  return domains.slice(0, 2).join(" · ") + (domains.length > 2 ? ` +${domains.length - 2}` : "");
}

function playlistUpdatedAt(updatedAt: Playlist["updatedAt"]) {
  return `Atualizada em ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(new Date(updatedAt))}`;
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="library-empty library-empty-playlists">
      <span className="library-empty-icon"><ListMusic aria-hidden="true" size={20} /></span>
      <div><h3>Sua biblioteca está pronta</h3><p>Monte uma fila para repetir depois.</p></div>
      <button className="primary-button" onClick={onCreate} type="button">Montar playlist</button>
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
