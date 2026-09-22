const imageExtension = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i;
const youtubeIdPattern = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i;

export function normalizeVideoUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const youtubeId = trimmed.match(youtubeIdPattern)?.[1];
  if (youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;
  return value;
}

export function isPlayableMediaUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (imageExtension.test(url.pathname)) return false;
    const host = url.hostname.toLowerCase();
    return !host.endsWith("ytimg.com") && !host.endsWith("ggpht.com");
  } catch {
    return false;
  }
}

export function isOwnUploadUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase().endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// react-player's AUDIO_EXTENSIONS regex expects "oga"/"weba", not "ogg"/"webm".
export const AUDIO_MIME_EXTENSIONS: Record<string, string> = {
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "oga",
  "audio/wav": "wav",
  "audio/webm": "weba",
};
