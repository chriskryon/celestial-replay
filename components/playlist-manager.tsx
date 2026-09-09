"use client";

import { ListMusic } from "lucide-react";
import { useMemo, useState } from "react";

import { AccountAreaTabs, AccountNavigation } from "@/components/account-navigation";
import { PlaylistEditor } from "@/components/playlists/playlist-editor";
import { PlaylistLibrary } from "@/components/playlists/playlist-library";
import type { DraftItem, Playlist, PlaylistInputMode } from "@/components/playlists/types";
import { Toast } from "@/components/toast";
import { createDraftItem, draftsFromSimple, initialDraftItem, parseSimplePlaylist, sourceDomain } from "@/lib/playlist-draft";
import { isPlayableMediaUrl } from "@/lib/media-url";

export function PlaylistManager({ initialPlaylists }: { initialPlaylists: Playlist[] }) {
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Minha playlist");
  const [inputMode, setInputMode] = useState<PlaylistInputMode>("advanced");
  const [simpleInput, setSimpleInput] = useState("");
  const [items, setItems] = useState<DraftItem[]>([initialDraftItem]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("todos");
  const [sort, setSort] = useState<"recent" | "name" | "size">("recent");

  const selected = useMemo(() => playlists.find((playlist) => playlist.id === selectedId) ?? null, [playlists, selectedId]);
  const parsedSimple = useMemo(() => parseSimplePlaylist(simpleInput), [simpleInput]);
  const availableDomains = useMemo(() => Array.from(new Set(playlists.flatMap((playlist) => playlist.items.map((item) => sourceDomain(item.url))))).sort(), [playlists]);
  const filteredPlaylists = useMemo(() => filterPlaylists(playlists, search, domainFilter, sort), [domainFilter, playlists, search, sort]);
  const isValid = isPlaylistDraftValid(name, inputMode, items, parsedSimple);

  function edit(playlist: Playlist) {
    setSelectedId(playlist.id);
    setName(playlist.name);
    setItems(playlist.items.map((item) => ({ id: crypto.randomUUID(), url: item.url, repetitions: String(item.repetitions) })));
    setSimpleInput(playlist.items.map((item) => `${item.url};${item.repetitions}`).join("\n"));
    setInputMode("advanced");
    setMessage(null);
  }

  function create() {
    setSelectedId(null);
    setName("Minha playlist");
    setSimpleInput("");
    setItems([initialDraftItem]);
    setInputMode("advanced");
    setMessage(null);
  }

  function changeInputMode(nextMode: PlaylistInputMode) {
    if (nextMode === inputMode) return;
    if (nextMode === "simple") setSimpleInput(items.map((item) => `${item.url};${item.repetitions}`).join("\n"));
    else setItems(draftsFromSimple(simpleInput));
    setInputMode(nextMode);
    setMessage(null);
  }

  function moveItem(id: string, direction: -1 | 1) {
    setItems((current) => {
      const from = current.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function reorderItems(sourceId: string, targetId: string) {
    setItems((current) => {
      const from = current.findIndex((item) => item.id === sourceId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  function updateItem(id: string, field: "url" | "repetitions", value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  async function duplicatePlaylist(playlist: Playlist) {
    setIsSaving(true);
    setMessage(null);
    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `${playlist.name} (cópia)`, items: playlist.items.map((item) => ({ url: item.url, repetitions: item.repetitions })) }),
    });
    const result = await response.json().catch(() => null);
    setIsSaving(false);
    if (!response.ok) return setMessage(result?.error ?? "Não foi possível duplicar agora.");
    const saved = result.playlist as Playlist;
    setPlaylists((current) => [saved, ...current]);
    edit(saved);
    setMessage("Playlist duplicada.");
  }

  async function save() {
    if (!isValid) return setMessage("Informe um nome, links válidos e pelo menos uma repetição por vídeo.");
    setIsSaving(true);
    setMessage(null);
    const response = await fetch(selected ? `/api/playlists/${selected.id}` : "/api/playlists", {
      method: selected ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, items: inputMode === "simple" ? parsedSimple : items.map((item) => ({ url: item.url.trim(), repetitions: Number(item.repetitions) })) }),
    });
    const result = await response.json().catch(() => null);
    setIsSaving(false);
    if (!response.ok) return setMessage(result?.error ?? "Não foi possível salvar agora.");
    const saved = result.playlist as Playlist;
    setPlaylists((current) => [saved, ...current.filter((playlist) => playlist.id !== saved.id)]);
    setSelectedId(saved.id);
    setMessage(selected ? "Alterações salvas." : "Playlist criada e salva.");
  }

  async function remove(playlist: Playlist) {
    const response = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Não foi possível apagar esta playlist agora.");
    setPlaylists((current) => current.filter((currentPlaylist) => currentPlaylist.id !== playlist.id));
    if (selectedId === playlist.id) create();
    setMessage("Playlist apagada.");
    setDeleteTarget(null);
  }

  return <>
    <AccountNavigation />
    <section className="studio-shell account-shell" aria-labelledby="playlist-library-title">
      <AccountAreaTabs activeArea="playlists" />
      <div className="playlist-library">
        <header className="library-heading"><span className="history-heading-icon"><ListMusic aria-hidden="true" size={22} /></span><div><h1 id="playlist-library-title">Suas playlists</h1><p>Crie, organize e ajuste as filas que você quer repetir.</p></div></header>
        <div className="library-grid">
          <PlaylistLibrary availableDomains={availableDomains} domainFilter={domainFilter} filteredPlaylists={filteredPlaylists} onCreate={create} onDomainChange={setDomainFilter} onDuplicate={(playlist) => void duplicatePlaylist(playlist)} onEdit={edit} onSearchChange={setSearch} onSortChange={setSort} playlists={playlists} search={search} selectedId={selectedId} sort={sort} />
          <PlaylistEditor inputMode={inputMode} isSaving={isSaving} isValid={isValid} items={items} name={name} onAddItem={() => setItems((current) => [...current, createDraftItem()])} onChangeMode={changeInputMode} onDelete={() => selected && setDeleteTarget(selected)} onDuplicateItem={(item) => setItems((current) => [...current, { ...item, id: crypto.randomUUID() }])} onMoveItem={moveItem} onNameChange={setName} onRemoveItem={(id) => setItems((current) => current.filter((item) => item.id !== id))} onReorderItems={reorderItems} onSave={() => void save()} onSimpleInputChange={setSimpleInput} onUpdateItem={updateItem} selected={selected} simpleInput={simpleInput} />
        </div>
        <Toast message={message} tone={message?.includes("não foi") || message?.includes("Informe") ? "error" : "success"} />
        {deleteTarget && <DeletePlaylistDialog onCancel={() => setDeleteTarget(null)} onConfirm={() => void remove(deleteTarget)} playlist={deleteTarget} />}
      </div>
    </section>
  </>;
}

function isPlaylistDraftValid(name: string, mode: PlaylistInputMode, items: DraftItem[], parsedSimple: ReturnType<typeof parseSimplePlaylist>) {
  if (name.trim().length === 0) return false;
  if (mode === "simple") return parsedSimple !== null;
  return items.length > 0 && items.every((item) => isPlayableMediaUrl(item.url.trim()) && Number.isInteger(Number(item.repetitions)) && Number(item.repetitions) > 0);
}

function filterPlaylists(playlists: Playlist[], search: string, domainFilter: string, sort: "recent" | "name" | "size") {
  return playlists.filter((playlist) => {
    const matchesSearch = playlist.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const matchesDomain = domainFilter === "todos" || playlist.items.some((item) => sourceDomain(item.url) === domainFilter);
    return matchesSearch && matchesDomain;
  }).sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name, "pt-BR");
    if (sort === "size") return right.items.length - left.items.length || left.name.localeCompare(right.name, "pt-BR");
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function DeletePlaylistDialog({ onCancel, onConfirm, playlist }: { onCancel: () => void; onConfirm: () => void; playlist: Playlist }) {
  return <div className="confirm-backdrop" role="presentation"><section aria-labelledby="delete-title" aria-modal="true" className="confirm-dialog" role="alertdialog"><h2 id="delete-title">Apagar playlist?</h2><p>“{playlist.name}” será apagada definitivamente.</p><div><button className="secondary-button" onClick={onCancel} type="button">Cancelar</button><button className="danger-button" onClick={onConfirm} type="button">Apagar playlist</button></div></section></div>;
}
