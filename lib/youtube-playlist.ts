export const YOUTUBE_PLAYLIST_MAX_ITEMS = 100;

const playlistIdPattern = /^[A-Za-z0-9_-]{10,200}$/;

export function youtubePlaylistIdFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const isYoutube = host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
    const playlistId = url.searchParams.get("list");
    return url.protocol === "https:" && isYoutube && playlistId && playlistIdPattern.test(playlistId) ? playlistId : null;
  } catch {
    return null;
  }
}
