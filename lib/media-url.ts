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
