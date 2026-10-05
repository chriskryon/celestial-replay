"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { canPlaySrc } from "@/components/react-player-client";
import { type PlaylistVerificationItem, type PlaylistVerificationTarget } from "@/lib/playlist-verification";
import { parsePlaylistLine, parseSingleReplay, type PlaylistDraft } from "@/lib/replay-playlist";

type UsePlaylistVerificationParams = {
  drafts: PlaylistDraft[];
  playlistInputMode: "simple" | "advanced";
  simplePlaylist: string;
};

const preferenceKey = "celestial-replay:verify-playlist-before-start";

export function usePlaylistVerification({ drafts, playlistInputMode, simplePlaylist }: UsePlaylistVerificationParams) {
  const [verifyBeforeStarting, setVerifyBeforeStartingState] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<Record<string, PlaylistVerificationItem>>({});

  const targets = useMemo<PlaylistVerificationTarget[]>(() => {
    if (playlistInputMode === "advanced") {
      return drafts.flatMap((draft) => {
        const parsed = parseSingleReplay(draft.src, draft.repetitions, canPlaySrc);
        return parsed ? [{ id: draft.id, source: parsed.src }] : [];
      });
    }

    return simplePlaylist.split("\n").flatMap((line, index) => {
      const parsed = line.trim() ? parsePlaylistLine(line, canPlaySrc) : null;
      return parsed ? [{ id: `simple-${index}`, source: parsed.src }] : [];
    });
  }, [drafts, playlistInputMode, simplePlaylist]);

  const targetKey = targets.map((target) => `${target.id}:${target.source}`).join("\n");

  useEffect(() => {
    try { setVerifyBeforeStartingState(localStorage.getItem(preferenceKey) === "true"); } catch { /* Mantém o padrão sem persistência. */ }
  }, []);

  useEffect(() => {
    setResults((current) => Object.fromEntries(targets.flatMap((target) => {
      const previous = current[target.id];
      return previous?.source === target.source ? [[target.id, previous]] : [];
    })));
  }, [targetKey, targets]);

  const setVerifyBeforeStarting = (enabled: boolean) => {
    setVerifyBeforeStartingState(enabled);
    try { localStorage.setItem(preferenceKey, String(enabled)); } catch { /* A preferência continua nesta sessão. */ }
  };

  const verify = useCallback(async () => {
    if (targets.length === 0) return [] as PlaylistVerificationItem[];
    setIsVerifying(true);
    setResults(Object.fromEntries(targets.map((target) => [target.id, { ...target, status: "checking" as const, message: "Verificando disponibilidade…" }])));
    try {
      const response = await fetch("/api/playlist-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: targets }),
      });
      const payload = await response.json().catch(() => null) as { items?: PlaylistVerificationItem[] } | null;
      if (!response.ok || !payload?.items) throw new Error();
      const nextResults = payload.items;
      setResults(Object.fromEntries(nextResults.map((item) => [item.id, item])));
      return nextResults;
    } catch {
      const fallback = targets.map((target) => ({ ...target, status: "unconfirmed" as const, message: "Não foi possível concluir o teste agora." }));
      setResults(Object.fromEntries(fallback.map((item) => [item.id, item])));
      return fallback;
    } finally {
      setIsVerifying(false);
    }
  }, [targets]);

  const hasUnavailableItems = targets.some((target) => results[target.id]?.source === target.source && results[target.id]?.status === "unavailable");
  const hasCurrentVerification = targets.length > 0 && targets.every((target) => {
    const result = results[target.id];
    return result?.source === target.source && result.status !== "checking";
  });

  return { hasCurrentVerification, hasUnavailableItems, isVerifying, results, setVerifyBeforeStarting, targets, verify, verifyBeforeStarting };
}
