export const YOUTUBE_PLAYLIST_MAX_ITEMS = 100;

const playlistIdPattern = /^[A-Za-z0-9_-]{10,200}$/;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

type YoutubePlaylistApiItem = {
  snippet?: {
    resourceId?: { kind?: string; videoId?: string };
    title?: string;
  };
};

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

export function youtubePlaylistVideoFromItem(item: YoutubePlaylistApiItem) {
  const videoId = item.snippet?.resourceId?.videoId;
  if (item.snippet?.resourceId?.kind !== "youtube#video" || !videoId || !youtubeVideoIdPattern.test(videoId)) return null;

  const title = item.snippet.title?.trim().slice(0, 200);
  return { id: videoId, ...(title ? { title } : {}) };
}
