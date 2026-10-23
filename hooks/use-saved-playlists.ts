"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { loadPlaylists, savePlaylist } from "@/lib/replay-api";
import { makeItem, type SavedPlaylist, type VideoItem } from "@/lib/replay-playlist";

type StartQueue = (items: VideoItem[], options: { playlistId: string | null; playlistName?: string; statusMessage: string }) => void;

type UseSavedPlaylistsParams = {
  isLoggedIn: boolean;
  mode: "single" | "playlist";
  setDraftPlaylistId: Dispatch<SetStateAction<string | null>>;
  setDrafts: Dispatch<SetStateAction<Array<{ id: string; src: string; repetitions: string }>>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setPlaylistInputMode: Dispatch<SetStateAction<"simple" | "advanced">>;
  setPlaylistName: Dispatch<SetStateAction<string>>;
  setPlaylistSaveMessage: Dispatch<SetStateAction<string | null>>;
  setQueuePlaylistName: Dispatch<SetStateAction<string>>;
  startQueue: StartQueue;
};

export function useSavedPlaylists({ isLoggedIn, mode, setDraftPlaylistId, setDrafts, setError, setPlaylistInputMode, setPlaylistName, setPlaylistSaveMessage, setQueuePlaylistName, startQueue }: UseSavedPlaylistsParams) {
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [isLoadingSavedPlaylists, setIsLoadingSavedPlaylists] = useState(false);
  const [savedPlaylistsError, setSavedPlaylistsError] = useState<string | null>(null);
  const routedPlaylistIdRef = useRef<string | null>(null);

  const refreshSavedPlaylists = useCallback(async () => {
    setIsLoadingSavedPlaylists(true);
    setSavedPlaylistsError(null);
    try {
      setSavedPlaylists(await loadPlaylists());
    } catch {
      setSavedPlaylistsError("Não foi possível carregar suas playlists agora.");
    } finally {
      setIsLoadingSavedPlaylists(false);
    }
  }, []);

  const loadSavedPlaylist = useCallback((playlist: SavedPlaylist) => {
    setDraftPlaylistId(playlist.id);
    setPlaylistName(playlist.name);
    setQueuePlaylistName(playlist.name);
    setPlaylistInputMode("advanced");
    setDrafts(playlist.items.map((item) => ({ id: crypto.randomUUID(), src: item.url, repetitions: String(item.repetitions) })));
    setError(null);
    setPlaylistSaveMessage(`Playlist “${playlist.name}” carregada. Revise ou inicie quando quiser.`);
  }, [setDraftPlaylistId, setDrafts, setError, setPlaylistInputMode, setPlaylistName, setPlaylistSaveMessage, setQueuePlaylistName]);

  const startSavedPlaylist = useCallback((playlist: SavedPlaylist) => {
    const queue = playlist.items.map((item) => makeItem(item.url.trim(), item.repetitions));
    startQueue(queue, { playlistId: playlist.id, playlistName: playlist.name, statusMessage: `Reproduzindo vídeo 1 de ${queue.length}.` });
  }, [startQueue]);

  const persistPlaylist = useCallback(async (input: { name: string; items: Array<{ url: string; repetitions: number }> }) => {
    const playlist = await savePlaylist(input);
    setSavedPlaylists((current) => [playlist, ...current.filter((item) => item.id !== playlist.id)]);
    return playlist;
  }, []);

  useEffect(() => {
    if (mode !== "playlist") return;
    if (!isLoggedIn) {
      setSavedPlaylists([]);
      setSavedPlaylistsError(null);
      return;
    }
    void refreshSavedPlaylists();
  }, [isLoggedIn, mode, refreshSavedPlaylists]);

  useEffect(() => {
    if (mode !== "playlist" || savedPlaylists.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const playlistId = params.get("playlistId");
    if (!playlistId || routedPlaylistIdRef.current === playlistId) return;
    const playlist = savedPlaylists.find((item) => item.id === playlistId);
    if (!playlist) return;

    routedPlaylistIdRef.current = playlistId;
    loadSavedPlaylist(playlist);
    if (params.get("autoplay") === "1") startSavedPlaylist(playlist);
    window.history.replaceState({}, "", window.location.pathname);
  }, [loadSavedPlaylist, mode, savedPlaylists, startSavedPlaylist]);

  return {
    isLoadingSavedPlaylists,
    loadSavedPlaylist,
    persistPlaylist,
    refreshSavedPlaylists,
    savedPlaylists,
    savedPlaylistsError,
    startSavedPlaylist,
  };
}
