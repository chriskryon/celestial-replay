import { isPlayableMediaUrl } from "@/lib/media-url";
import type { DraftItem } from "@/components/playlists/types";

export const initialDraftItem: DraftItem = {
  id: "new-playlist-item",
  url: "",
  repetitions: "1",
};

export function createDraftItem(): DraftItem {
  return { id: crypto.randomUUID(), url: "", repetitions: "1" };
}

export function sourceDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "outro";
  }
}

/** The simple mode accepts exactly one playable URL and a positive integer per line. */
export function parseSimplePlaylist(value: string) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const parsed = lines.map((line) => {
    const [url, repetitions, ...extra] = line.split(";").map((part) => part.trim());
    const count = Number(repetitions);
    return extra.length === 0 && isPlayableMediaUrl(url) && Number.isInteger(count) && count > 0
      ? { url, repetitions: count }
      : null;
  });

  return parsed.every(Boolean) ? parsed as Array<{ url: string; repetitions: number }> : null;
}

export function draftsFromSimple(value: string): DraftItem[] {
  const drafts = value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [url = "", repetitions = "1"] = line.split(";").map((part) => part.trim());
    return { id: crypto.randomUUID(), url, repetitions };
  });

  return drafts.length > 0 ? drafts : [initialDraftItem];
}
