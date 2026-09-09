import { canPlaySrc } from "@/components/react-player-client";

function hostname(source: string) {
  try {
    return new URL(source).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Traduz a falha genérica dos provedores em uma orientação que a pessoa possa
 * resolver. Eventos de erro de embeds não expõem o motivo detalhado, portanto
 * a mensagem descreve possibilidades, nunca afirma uma causa específica.
 */
export function playbackErrorMessage(source: string) {
  if (!source || !canPlaySrc(source)) {
    return "Esta fonte não é suportada. Use YouTube, Vimeo, HLS/DASH ou um arquivo de vídeo/áudio direto.";
  }

  const host = hostname(source);
  if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    return "O YouTube não liberou a reprodução incorporada. Verifique se o vídeo é público, permite embed e não possui restrição de idade ou região.";
  }
  if (host.endsWith("vimeo.com")) {
    return "O Vimeo não liberou esta incorporação. Verifique as permissões do vídeo e os domínios autorizados pelo proprietário.";
  }
  if (/\.(m3u8|mpd)(?:$|[?#])/i.test(source)) {
    return "Este stream não pôde ser aberto. Confirme se a URL está ativa, permite CORS e é compatível com este navegador.";
  }
  if (/\.(mp4|webm|ogg|mp3|m4a|wav)(?:$|[?#])/i.test(source)) {
    return "Este arquivo de mídia não pôde ser carregado. Confira se o link é público, está ativo e permite acesso pelo navegador.";
  }

  return "Não foi possível carregar este vídeo. Ele pode estar privado, com incorporação desativada ou temporariamente indisponível.";
}
