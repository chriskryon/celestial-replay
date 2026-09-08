// Bateria de URLs vs isPlayableMediaUrl (lib/media-url.ts).
// Uso: node scripts/url-battery.mjs
// Sai com código 1 se algum caso divergir do esperado.
import { isPlayableMediaUrl } from "../lib/media-url.ts";

// canPlay do react-player precisa de DOM (custom elements); em Node tentamos
// e, se falhar, a comparação fica manual (coluna canPlay = "n/a").
let canPlay = null;
try {
  const mod = await import("react-player");
  const fn = mod.default?.canPlay ?? mod.canPlay;
  if (typeof fn === "function") canPlay = fn;
} catch {
  canPlay = null;
}

// [url, esperado, motivo]
const cases = [
  // YouTube — todos devem passar
  ["https://www.youtube.com/watch?v=qqM4cAlbroQ", true, "youtube watch"],
  ["https://youtu.be/qqM4cAlbroQ", true, "youtube short-link"],
  ["https://www.youtube.com/embed/qqM4cAlbroQ", true, "youtube embed"],
  ["https://www.youtube.com/shorts/qqM4cAlbroQ", true, "youtube shorts"],
  ["https://m.youtube.com/watch?v=qqM4cAlbroQ", true, "youtube mobile"],
  ["https://www.youtube-nocookie.com/embed/qqM4cAlbroQ", true, "youtube nocookie"],
  // Vimeo
  ["https://vimeo.com/123456789", true, "vimeo watch"],
  ["https://player.vimeo.com/video/123456789", true, "vimeo embed"],
  // Arquivos / streams
  ["https://cdn.example.com/video.mp4", true, "mp4 direto"],
  ["https://cdn.example.com/video.webm", true, "webm direto"],
  ["https://cdn.example.com/audio.mp3", true, "mp3 direto"],
  ["https://cdn.example.com/stream.m3u8", true, "hls"],
  ["https://cdn.example.com/stream.mpd", true, "dash"],
  // Rejeições esperadas
  ["https://evil.com/foto.png", false, "imagem png"],
  ["https://evil.com/foto.jpg", false, "imagem jpg"],
  ["https://evil.com/img.svg", false, "imagem svg"],
  ["javascript:alert(1)", false, "esquema javascript"],
  ["ftp://evil.com/video.mp4", false, "esquema ftp"],
  ["https://i.ytimg.com/vi/qqM4cAlbroQ/hqdefault.jpg", false, "thumbnail ytimg"],
  ["https://lh3.ggpht.com/thumb.jpg", false, "thumbnail ggpht"],
  ["not-a-url", false, "lixo"],
  // Comportamento atual documentado (REVISAR — ver SECURITY_ROADMAP):
  // passam hoje, mas são questionáveis como fonte de reprodução.
  ["http://cdn.example.com/video.mp4", true, "REVISAR: http cleartext passa"],
  ["http://localhost:3000/admin", true, "REVISAR: localhost passa"],
  ["http://169.254.169.254/latest/meta-data/", true, "REVISAR: link-local passa"],
  ["https://evil.com:22/shell.sh", true, "REVISAR: porta arbitrária passa"],
  ["https://evil.com/video.mp4#.png", true, "REVISAR: bypass de extensão via fragmento passa"],
  [`https://evil.com/${"a".repeat(5000)}.mp4`, true, "REVISAR: URL gigante passa (sem teto)"],
];

let failures = 0;
for (const [url, expected, note] of cases) {
  const got = isPlayableMediaUrl(url);
  let cp = "n/a";
  try {
    if (canPlay) cp = String(canPlay(url));
  } catch {
    cp = "erro";
  }
  const ok = got === expected;
  if (!ok) failures++;
  const short = url.length > 70 ? `${url.slice(0, 67)}...` : url;
  console.log(`${ok ? "PASS" : "FAIL"} valid=${got} esperado=${expected} canPlay=${cp} | ${short} | ${note}`);
}

console.log(`\n${cases.length - failures}/${cases.length} ok${canPlay ? "" : " (canPlay indisponível em Node — comparar manualmente na demo)"}`);
process.exit(failures === 0 ? 0 : 1);
