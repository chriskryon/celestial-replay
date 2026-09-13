const imageExtension = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i;

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
