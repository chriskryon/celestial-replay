import type { ResumableSession, SavedPlaylist, VideoItem } from "@/lib/replay-playlist";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => null) as T & { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || "Não foi possível concluir a operação.");
  return payload as T;
}

export async function loadPlaylists(): Promise<SavedPlaylist[]> {
  const payload = await request<{ playlists?: SavedPlaylist[] }>("/api/playlists");
  return payload.playlists ?? [];
}

export async function savePlaylist(input: { name: string; items: Array<{ url: string; repetitions: number }> }): Promise<SavedPlaylist> {
  const payload = await request<{ playlist: SavedPlaylist }>("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return payload.playlist;
}

export async function loadPlaybackSession(): Promise<ResumableSession | null> {
  const payload = await request<{ session?: ResumableSession | null }>("/api/playback-session");
  return payload.session ?? null;
}

export async function savePlaybackSession(input: { queue: VideoItem[]; activeIndex: number | null; remaining: number; playlistName: string; volume: number; playbackRate: number }) {
  await request("/api/playback-session", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function clearPlaybackSession() {
  await request("/api/playback-session", { method: "DELETE" });
}

export async function saveHistory(input: { url: string; completedRepetitions: number }) {
  await request("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
