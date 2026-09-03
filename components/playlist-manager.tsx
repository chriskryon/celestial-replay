"use client";

import Link from "next/link";
import { History, ListMusic, Pencil, Play, Plus, Save, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AuthControls } from "@/components/auth-controls";
import { OpenAuthButton } from "@/components/open-auth-button";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { Toast } from "@/components/toast";

type PlaylistItem = { id: string; url: string; repetitions: number; position: number };
type Playlist = { id: string; name: string; items: PlaylistItem[]; updatedAt: string };
type DraftItem = { id: string; url: string; repetitions: string };

const draftItem = (): DraftItem => ({ id: crypto.randomUUID(), url: "", repetitions: "1" });
const initialDraftItem: DraftItem = { id: "new-playlist-item", url: "", repetitions: "1" };

function parseSimplePlaylist(value: string) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const parsed = lines.map((line) => {
    const [url, repetitions, ...extra] = line.split(";").map((part) => part.trim());
    const count = Number(repetitions);
    return extra.length === 0 && isPlayableMediaUrl(url) && Number.isInteger(count) && count > 0 ? { url, repetitions: count } : null;
  });
  return parsed.every(Boolean) ? parsed as Array<{ url: string; repetitions: number }> : null;
}

function draftsFromSimple(value: string): DraftItem[] {
  const drafts = value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [url = "", repetitions = "1"] = line.split(";").map((part) => part.trim());
    return { id: crypto.randomUUID(), url, repetitions };
  });
  return drafts.length > 0 ? drafts : [initialDraftItem];
}

export function PlaylistManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Minha playlist");
  const [inputMode, setInputMode] = useState<"simple" | "advanced">("advanced");
  const [simpleInput, setSimpleInput] = useState("");
  const [items, setItems] = useState<DraftItem[]>([initialDraftItem]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);

  const selected = useMemo(() => playlists.find((playlist) => playlist.id === selectedId) ?? null, [playlists, selectedId]);
  const parsedSimple = useMemo(() => parseSimplePlaylist(simpleInput), [simpleInput]);
  const isValid = name.trim().length > 0 && (inputMode === "simple"
    ? parsedSimple !== null
    : items.length > 0 && items.every((item) => isPlayableMediaUrl(item.url.trim()) && Number.isInteger(Number(item.repetitions)) && Number(item.repetitions) > 0));

  const load = async () => {
    const response = await fetch("/api/playlists");
    if (response.status === 401) { setIsSignedOut(true); setIsLoading(false); return; }
    if (!response.ok) { setMessage("Não foi possível carregar suas playlists agora."); setIsLoading(false); return; }
    const result = await response.json() as { playlists: Playlist[] };
    setPlaylists(result.playlists);
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const edit = (playlist: Playlist) => {
    setSelectedId(playlist.id);
    setName(playlist.name);
    setItems(playlist.items.map((item) => ({ id: crypto.randomUUID(), url: item.url, repetitions: String(item.repetitions) })));
    setSimpleInput(playlist.items.map((item) => `${item.url};${item.repetitions}`).join("\n"));
    setInputMode("advanced");
    setMessage(null);
  };

  const create = () => { setSelectedId(null); setName("Minha playlist"); setSimpleInput(""); setItems([initialDraftItem]); setInputMode("advanced"); setMessage(null); };
  const updateItem = (id: string, field: "url" | "repetitions", value: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const changeInputMode = (nextMode: "simple" | "advanced") => {
    if (nextMode === inputMode) return;
    if (nextMode === "simple") setSimpleInput(items.map((item) => `${item.url};${item.repetitions}`).join("\n"));
    else setItems(draftsFromSimple(simpleInput));
    setInputMode(nextMode);
    setMessage(null);
  };

  const save = async () => {
    if (!isValid) { setMessage("Informe um nome, links válidos e pelo menos uma repetição por vídeo."); return; }
    setIsSaving(true); setMessage(null);
    const response = await fetch(selected ? `/api/playlists/${selected.id}` : "/api/playlists", {
      method: selected ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, items: inputMode === "simple" ? parsedSimple : items.map((item) => ({ url: item.url.trim(), repetitions: Number(item.repetitions) })) }),
    });
    const result = await response.json().catch(() => null);
    setIsSaving(false);
    if (!response.ok) { setMessage(result?.error ?? "Não foi possível salvar agora."); return; }
    const saved = result.playlist as Playlist;
    setPlaylists((current) => [saved, ...current.filter((playlist) => playlist.id !== saved.id)]);
    setSelectedId(saved.id);
    setMessage(selected ? "Alterações salvas." : "Playlist criada e salva.");
  };

  const remove = async (playlist: Playlist) => {
    const response = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Não foi possível apagar esta playlist agora."); return; }
    setPlaylists((current) => current.filter((currentPlaylist) => currentPlaylist.id !== playlist.id));
    if (selectedId === playlist.id) create();
    setMessage("Playlist apagada.");
    setDeleteTarget(null);
  };

  return <>
    <header className="studio-heading"><div className="navbar-inner"><h1><Link className="brand-mark" href="/"><span aria-hidden="true"><ListMusic size={19} /></span>Celestial Replay</Link></h1><AuthControls /></div></header>
    <section className="studio-shell account-shell" aria-labelledby="playlist-library-title">
      <nav className="studio-tabs" aria-label="Áreas do Celestial Replay"><Link className="studio-tab" href="/"><Video aria-hidden="true" size={16} />Vídeo único</Link><Link className="studio-tab" href="/advanced"><ListMusic aria-hidden="true" size={16} />Playlist</Link><Link className="studio-tab is-selected" href="/playlists" aria-current="page"><ListMusic aria-hidden="true" size={16} />Minhas playlists</Link><Link className="studio-tab" href="/history"><History aria-hidden="true" size={16} />Histórico</Link></nav>
      <div className="playlist-library">
      <header className="library-heading"><span className="history-heading-icon"><ListMusic aria-hidden="true" size={22} /></span><div><h1 id="playlist-library-title">Suas playlists</h1><p>Crie, organize e ajuste as filas que você quer repetir.</p></div></header>
      {isSignedOut ? <div className="library-empty"><ListMusic aria-hidden="true" size={24} /><p>Entre para criar playlists privadas e acessá-las em qualquer dispositivo.</p><OpenAuthButton>Entrar para salvar</OpenAuthButton></div> : <div className="library-grid">
        <aside className="library-list" aria-label="Playlists salvas"><button className="new-playlist" type="button" onClick={create}><Plus aria-hidden="true" size={17} />Nova playlist</button>{isLoading ? <p>Carregando playlists…</p> : playlists.length === 0 ? <div className="library-empty"><Play aria-hidden="true" size={20} /><p>Você ainda não salvou nenhuma playlist.</p></div> : <ul>{playlists.map((playlist) => <li key={playlist.id}><button className={playlist.id === selectedId ? "library-playlist is-selected" : "library-playlist"} type="button" onClick={() => edit(playlist)}><span><strong>{playlist.name}</strong><small>{playlist.items.length} {playlist.items.length === 1 ? "vídeo" : "vídeos"}</small></span><Pencil aria-hidden="true" size={15} /></button></li>)}</ul>}</aside>
        <section className="library-editor" aria-labelledby="editor-title"><div className="library-editor-heading"><div><h2 id="editor-title">{selected ? "Editar playlist" : "Nova playlist"}</h2><p>{selected ? "As mudanças substituem a versão salva." : "Adicione um ou mais vídeos para criar sua fila."}</p></div>{selected && <button className="icon-danger" type="button" onClick={() => setDeleteTarget(selected)} aria-label={`Apagar ${selected.name}`}><Trash2 aria-hidden="true" size={17} /></button>}</div>
          <label htmlFor="library-playlist-name">Nome da playlist</label><input id="library-playlist-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          <div className="playlist-input-mode" role="tablist" aria-label="Forma de montar a playlist"><button className={inputMode === "simple" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={inputMode === "simple"} onClick={() => changeInputMode("simple")}>Simples: linhas</button><button className={inputMode === "advanced" ? "mode-button is-selected" : "mode-button"} type="button" role="tab" aria-selected={inputMode === "advanced"} onClick={() => changeInputMode("advanced")}>Avançado: campos</button></div>
          {inputMode === "simple" ? <div className="simple-playlist-input"><label htmlFor="library-simple-playlist">Vídeos e repetições</label><textarea id="library-simple-playlist" value={simpleInput} onChange={(event) => setSimpleInput(event.target.value)} placeholder={"https://youtube.com/watch?v=exemplo;3\nhttps://vimeo.com/exemplo;1"} spellCheck="false" /><p>Uma linha por vídeo: <code>link;quantidade</code>.</p></div> : <><div className="library-items" aria-label="Vídeos da playlist">{items.map((item, index) => <div className="playlist-row" key={item.id}><span className="row-number" aria-hidden="true">{index + 1}</span><label className="sr-only" htmlFor={`library-url-${item.id}`}>URL do vídeo {index + 1}</label><input id={`library-url-${item.id}`} value={item.url} onChange={(event) => updateItem(item.id, "url", event.target.value)} placeholder="Cole a URL do vídeo" inputMode="url" autoComplete="url" /><label className="sr-only" htmlFor={`library-repetitions-${item.id}`}>Repetições do vídeo {index + 1}</label><input id={`library-repetitions-${item.id}`} type="number" min="1" step="1" value={item.repetitions} onChange={(event) => updateItem(item.id, "repetitions", event.target.value)} />{items.length > 1 && <button className="remove-row" type="button" onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} aria-label={`Remover vídeo ${index + 1}`}><Trash2 aria-hidden="true" size={17} /></button>}</div>)}</div><button className="add-row" type="button" onClick={() => setItems((current) => [...current, draftItem()])}><Plus aria-hidden="true" size={17} />Adicionar vídeo</button></>}
          <button className="primary-button" type="button" onClick={save} disabled={!isValid || isSaving}><Save aria-hidden="true" size={17} />{isSaving ? "Salvando…" : selected ? "Salvar alterações" : "Criar playlist"}</button>
        </section>
      </div>}<Toast message={message} tone={message?.includes("não foi") || message?.includes("Informe") ? "error" : "success"}/>{deleteTarget && <div className="confirm-backdrop" role="presentation"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Apagar playlist?</h2><p>“{deleteTarget.name}” será apagada definitivamente.</p><div><button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button><button className="danger-button" type="button" onClick={() => void remove(deleteTarget)}>Apagar playlist</button></div></section></div>}
      </div></section>
  </>;
}
