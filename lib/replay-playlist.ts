import { isPlayableMediaUrl } from "@/lib/media-url";

export type VideoItem = { id: string; src: string; repetitions: number };
export type PlaylistDraft = { id: string; src: string; repetitions: string };
export type ParsedPlaylistItem = { src: string; count: number };
export type SavedPlaylist = { id: string; name: string; items: Array<{ id: string; url: string; repetitions: number }> };
export type ResumableSession = { queue: VideoItem[]; activeIndex: number; remaining: number; playlistName: string; volume: number; playbackRate?: number };

type CanPlay = (src: string) => boolean;

export const makeItem = (src: string, repetitions: number): VideoItem => ({ id: crypto.randomUUID(), src, repetitions });
export const makeDraft = (): PlaylistDraft => ({ id: crypto.randomUUID(), src: "", repetitions: "1" });

export function isPlayableItem(item: VideoItem, canPlay: CanPlay) {
  const src = item.src.trim();
  return isPlayableMediaUrl(src) && canPlay(src) && Number.isInteger(item.repetitions) && item.repetitions > 0;
}

export function parsePlaylistLines(value: string, canPlay: CanPlay): ParsedPlaylistItem[] | null {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const parsed = lines.map((line) => parsePlaylistLine(line, canPlay));
  return parsed.every(Boolean) ? parsed as ParsedPlaylistItem[] : null;
}

export function parseFirstPlaylistLine(value: string, canPlay: CanPlay): ParsedPlaylistItem | null {
  const line = value.split("\n").map((item) => item.trim()).find(Boolean);
  return line ? parsePlaylistLine(line, canPlay) : null;
}

export function parsePlaylistLine(line: string, canPlay: CanPlay): ParsedPlaylistItem | null {
  const [src, repetitions, ...extra] = line.split(";").map((part) => part.trim());
  const count = Number(repetitions);
  return extra.length === 0 && isPlayableMediaUrl(src) && canPlay(src) && Number.isInteger(count) && count > 0 ? { src, count } : null;
}
