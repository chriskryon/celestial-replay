import { permanentRedirect } from "next/navigation";

/** Legacy URL retained only for existing bookmarks. */
export default function StackEditorPage() {
  permanentRedirect("/playlists");
}
