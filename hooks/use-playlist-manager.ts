"use client";

import { useMemo, useState } from "react";

import type { DraftItem, Playlist, PlaylistInputMode } from "@/components/playlists/types";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { createDraftItem, draftsFromSimple, initialDraftItem, parseSimplePlaylist, sourceDomain } from "@/lib/playlist-draft";

type PlaylistSort = "recent" | "name" | "size";

export function usePlaylistManager(initialPlaylists: Playlist[]) {
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
  const [sort, setSort] = useState<PlaylistSort>("recent");

  const selected = useMemo(() => playlists.find((playlist) => playlist.id === selectedId) ?? null, [playlists, selectedId]);
  const parsedSimple = useMemo(() => parseSimplePlaylist(simpleInput), [simpleInput]);
  const availableDomains = useMemo(() => getAvailableDomains(playlists), [playlists]);
  const filteredPlaylists = useMemo(() => filterPlaylists(playlists, search, domainFilter, sort), [domainFilter, playlists, search, sort]);
  const isValid = isPlaylistDraftValid(name, inputMode, items, parsedSimple);

  function edit(playlist: Playlist) {
    setSelectedId(playlist.id);
    setName(playlist.name);
    setItems(playlist.items.map(toDraftItem));
    setSimpleInput(toSimpleInput(playlist));
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
    setItems((current) => moveDraftItem(current, id, direction));
  }

  function reorderItems(sourceId: string, targetId: string) {
    setItems((current) => reorderDraftItems(current, sourceId, targetId));
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
      body: JSON.stringify({ name: `${playlist.name} (cópia)`, items: toSavedItems(playlist.items) }),
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
      body: JSON.stringify({ name, items: inputMode === "simple" ? parsedSimple : toDraftPayload(items) }),
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

  return {
    availableDomains,
    create,
    deleteTarget,
    duplicatePlaylist,
    edit,
    filteredPlaylists,
    inputMode,
    isSaving,
    isValid,
    items,
    message,
    name,
    playlists,
    remove,
    search,
    selected,
    selectedId,
    setDeleteTarget,
    setDomainFilter,
    setName,
    setSearch,
    setSimpleInput,
    setSort,
    simpleInput,
    sort,
    domainFilter,
    addItem: () => setItems((current) => [...current, createDraftItem()]),
    changeInputMode,
    duplicateItem: (item: DraftItem) => setItems((current) => [...current, { ...item, id: crypto.randomUUID() }]),
    moveItem,
    removeItem: (id: string) => setItems((current) => current.filter((item) => item.id !== id)),
    reorderItems,
    save,
    updateItem,
  };
}

function toDraftItem(item: Playlist["items"][number]): DraftItem {
  return { id: crypto.randomUUID(), url: item.url, repetitions: String(item.repetitions) };
}

function toSimpleInput(playlist: Playlist) {
  return playlist.items.map((item) => `${item.url};${item.repetitions}`).join("\n");
}

function toSavedItems(items: Playlist["items"]) {
  return items.map((item) => ({ url: item.url, repetitions: item.repetitions }));
}

function toDraftPayload(items: DraftItem[]) {
  return items.map((item) => ({ url: item.url.trim(), repetitions: Number(item.repetitions) }));
}

function getAvailableDomains(playlists: Playlist[]) {
  return Array.from(new Set(playlists.flatMap((playlist) => playlist.items.map((item) => sourceDomain(item.url))))).sort();
}

function isPlaylistDraftValid(name: string, mode: PlaylistInputMode, items: DraftItem[], parsedSimple: ReturnType<typeof parseSimplePlaylist>) {
  if (name.trim().length === 0) return false;
  if (mode === "simple") return parsedSimple !== null;
  return items.length > 0 && items.every((item) => isPlayableMediaUrl(item.url.trim()) && Number.isInteger(Number(item.repetitions)) && Number(item.repetitions) > 0);
}

function filterPlaylists(playlists: Playlist[], search: string, domainFilter: string, sort: PlaylistSort) {
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

function moveDraftItem(items: DraftItem[], id: string, direction: -1 | 1) {
  const from = items.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function reorderDraftItems(items: DraftItem[], sourceId: string, targetId: string) {
  const from = items.findIndex((item) => item.id === sourceId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
