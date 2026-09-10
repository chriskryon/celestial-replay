import { useState } from "react";
import type { PlaylistDraft } from "@/lib/replay-playlist";

export function usePlaylistDraft() {
  const [simplePlaylist, setSimplePlaylist] = useState("");
  const [drafts, setDrafts] = useState<PlaylistDraft[]>([{ id: "playlist-draft-0", src: "", repetitions: "1" }]);
  return { drafts, setDrafts, simplePlaylist, setSimplePlaylist };
}
