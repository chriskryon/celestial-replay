import { isPlayableMediaUrl } from "@/lib/media-url";
export type PlaylistEntry = { url: string; repetitions: number };
type CanPlay = (src: string) => boolean;
export function isValidPlaylistEntry(entry: PlaylistEntry, canPlay: CanPlay) { const url = entry.url.trim(); return isPlayableMediaUrl(url) && canPlay(url) && Number.isInteger(entry.repetitions) && entry.repetitions > 0; }
export function canSavePlaylist(entries: PlaylistEntry[] | null | undefined, name: string, isLoggedIn: boolean, canPlay: CanPlay) { return isLoggedIn && Boolean(name.trim()) && Boolean(entries?.length) && entries!.every((entry) => isValidPlaylistEntry(entry, canPlay)); }
