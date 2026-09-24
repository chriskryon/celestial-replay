"use client";

import { useEffect, useMemo, useState } from "react";

import { canPlaySrc } from "@/components/react-player-client";
import { isPlayableMediaUrl, normalizeVideoUrlInput } from "@/lib/media-url";
import { parseFirstPlaylistLine, parsePlaylistDrafts, parsePlaylistLine, parsePlaylistLines, parseSingleReplay } from "@/lib/replay-playlist";
import { usePlaylistDraft } from "@/hooks/use-playlist-draft";

type UsePlaylistComposerParams = {
  initialMode?: "single" | "playlist";
  setError: (error: string | null) => void;
  setStatus: (status: string) => void;
};

// Estado e validação do formulário de montagem — vídeo único e rascunho de
// playlist, antes de virar fila de reprodução. "Playlists salvas" e o que
// inicia a reprodução continuam no componente: dependem de estado do motor
// de reprodução (queue, activeSavedPlaylistId) e forçar esse corte agora só
// mudaria o endereço do acoplamento, não removeria ele.
export function usePlaylistComposer({ initialMode = "single", setError, setStatus }: UsePlaylistComposerParams) {
  const [mode, setMode] = useState(initialMode);
  const [source, setSource] = useState("");
  const [repetitions, setRepetitions] = useState("3");
  const [playlistInputMode, setPlaylistInputMode] = useState<"simple" | "advanced">("advanced");
  const { drafts, setDrafts, simplePlaylist, setSimplePlaylist } = usePlaylistDraft();
  const [playlistName, setPlaylistName] = useState("Minha playlist");
  const [playlistSaveMessage, setPlaylistSaveMessage] = useState<string | null>(null);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [draftPlaylistId, setDraftPlaylistId] = useState<string | null>(null);

  const singleReplay = useMemo(() => parseSingleReplay(source, repetitions, canPlaySrc), [repetitions, source]);
  const canSubmitSingle = singleReplay !== null;
  const playlistItems = useMemo(() => parsePlaylistDrafts(drafts, canPlaySrc), [drafts]);
  const simplePlaylistItems = useMemo(() => parsePlaylistLines(simplePlaylist, canPlaySrc), [simplePlaylist]);
  const firstSimplePlaylistItem = useMemo(() => parseFirstPlaylistLine(simplePlaylist, canPlaySrc), [simplePlaylist]);
  const canSubmitPlaylist = playlistInputMode === "simple"
    ? simplePlaylistItems !== null
    : playlistItems !== null;
  // Motivo do Iniciar desabilitado — botão cinza sem explicação é beco sem saída.
  const singleHint = !canSubmitSingle
    ? !source.trim()
      ? "Cole a URL do vídeo para liberar o início."
      : !isPlayableMediaUrl(source.trim()) || !canPlaySrc(source.trim())
        ? "Essa URL não é reproduzível aqui — use YouTube, Vimeo ou arquivo direto."
        : "Repetições: número inteiro maior que zero."
    : null;
  const firstBadDraft = playlistInputMode === "advanced"
    ? drafts.findIndex((draft) => !parseSingleReplay(draft.src, draft.repetitions, canPlaySrc))
    : -1;
  const playlistHint = !canSubmitPlaylist
    ? playlistInputMode === "simple"
      ? "Revise a lista: cada linha precisa de um link e uma quantidade válidos."
      : firstBadDraft >= 0
        ? `Revise o vídeo ${firstBadDraft + 1}: URL ou repetições inválidas.`
        : "Revise os vídeos da playlist."
    : null;
  const simplePlaylistLineCount = simplePlaylist.split("\n").filter((line) => line.trim()).length;
  const invalidSimpleLine = playlistInputMode === "simple"
    ? simplePlaylist.split("\n").findIndex((line) => {
      const value = line.trim();
      if (!value) return false;
      return !parsePlaylistLine(value, canPlaySrc);
    })
    : -1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const replaySource = params.get("source");
    const replayRepetitions = Number(params.get("repetitions"));
    if (!replaySource || !isPlayableMediaUrl(replaySource) || !Number.isInteger(replayRepetitions) || replayRepetitions < 1) return;
    setMode("single");
    setSource(normalizeVideoUrlInput(replaySource));
    setRepetitions(String(replayRepetitions));
    setStatus("Vídeo carregado do histórico. Inicie quando quiser.");
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roteamento por URL, uma vez só no mount (comportamento original preservado)
  }, []);

  const updateDraft = (id: string, field: "src" | "repetitions", value: string) => {
    setDraftPlaylistId(null);
    setDrafts((items) => items.map((item) => item.id === id
      ? {
        ...item,
        [field]: field === "src" ? normalizeVideoUrlInput(value) : value,
        ...(field === "src" ? { title: undefined } : {}),
      }
      : item));
    setError(null);
  };

  return {
    canSubmitPlaylist,
    canSubmitSingle,
    draftPlaylistId,
    drafts,
    firstSimplePlaylistItem,
    invalidSimpleLine,
    isSavingPlaylist,
    mode,
    playlistHint,
    playlistInputMode,
    playlistItems,
    playlistName,
    playlistSaveMessage,
    repetitions,
    setDraftPlaylistId,
    setDrafts,
    setIsSavingPlaylist,
    setMode,
    setPlaylistInputMode,
    setPlaylistName,
    setPlaylistSaveMessage,
    setRepetitions,
    setSimplePlaylist: (value: string) => setSimplePlaylist(normalizeSimplePlaylistInput(value)),
    setSource: (value: string) => setSource(normalizeVideoUrlInput(value)),
    simplePlaylist,
    simplePlaylistItems,
    simplePlaylistLineCount,
    singleHint,
    singleReplay,
    source,
    updateDraft,
  };
}

function normalizeSimplePlaylistInput(value: string) {
  return value.split("\n").map((line) => {
    const [url = "", repetitions, ...extra] = line.split(";");
    if (extra.length > 0) return line;
    const normalizedUrl = normalizeVideoUrlInput(url);
    return repetitions === undefined ? normalizedUrl : `${normalizedUrl};${repetitions}`;
  }).join("\n");
}
