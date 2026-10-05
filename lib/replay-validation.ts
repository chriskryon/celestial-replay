import { isSupportedReplaySource, type CanPlay } from "@/lib/replay-source";

export type PlaylistEntry = { url: string; repetitions: number };

export function isValidPlaylistEntry(entry: PlaylistEntry, canPlay: CanPlay) {
  return isSupportedReplaySource(entry.url, canPlay) && Number.isInteger(entry.repetitions) && entry.repetitions > 0;
}

export function canSavePlaylist(entries: PlaylistEntry[] | null | undefined, name: string, isLoggedIn: boolean, canPlay: CanPlay) {
  return isLoggedIn && Boolean(name.trim()) && Boolean(entries?.length) && entries!.every((entry) => isValidPlaylistEntry(entry, canPlay));
}
