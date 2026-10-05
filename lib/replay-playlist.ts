import { isPlayableMediaUrl, normalizeVideoUrlInput } from "@/lib/media-url";
import { z } from "zod";
import { isSupportedReplaySource, type CanPlay } from "@/lib/replay-source";

export type VideoItem = { id: string; src: string; repetitions: number; skippedRepetitions?: number };
export type PlaylistDraft = { id: string; src: string; title?: string; repetitions: string };
export type ParsedPlaylistItem = { src: string; count: number };
export type SavedPlaylist = { id: string; name: string; items: Array<{ id: string; url: string; repetitions: number }> };
export type ResumableSession = { queue: VideoItem[]; activeIndex: number; remaining: number; playlistName: string; volume: number; playbackRate?: number };

const sourceSchema = z.string().trim().url().refine(isPlayableMediaUrl);
const repetitionsSchema = z.coerce.number().int().positive();
const playlistLineSchema = z.object({ src: sourceSchema, repetitions: repetitionsSchema });

export const makeItem = (src: string, repetitions: number): VideoItem => ({ id: crypto.randomUUID(), src, repetitions });
export const makeDraft = (): PlaylistDraft => ({ id: crypto.randomUUID(), src: "", repetitions: "1" });

export function parseSingleReplay(source: string, repetitions: string, canPlay: CanPlay): ParsedPlaylistItem | null {
  const result = playlistLineSchema.safeParse({ src: normalizeVideoUrlInput(source), repetitions });
  return result.success && isSupportedReplaySource(result.data.src, canPlay) ? { src: result.data.src, count: result.data.repetitions } : null;
}

export function parsePlaylistDrafts(drafts: PlaylistDraft[], canPlay: CanPlay): ParsedPlaylistItem[] | null {
  if (drafts.length === 0) return null;
  const result = z.array(playlistLineSchema).min(1).safeParse(drafts);
  return result.success && result.data.every((item) => isSupportedReplaySource(item.src, canPlay))
    ? result.data.map((item) => ({ src: item.src, count: item.repetitions }))
    : null;
}

export function isPlayableItem(item: VideoItem, canPlay: CanPlay) {
  const src = item.src.trim();
  return isSupportedReplaySource(src, canPlay) && Number.isInteger(item.repetitions) && item.repetitions > 0;
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
  return extra.length === 0 ? parseSingleReplay(src, repetitions, canPlay) : null;
}
