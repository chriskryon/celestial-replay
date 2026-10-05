import { isPlayableMediaUrl } from "@/lib/media-url";
import { isOdyseeSource } from "@/lib/odysee";

export type CanPlay = (source: string) => boolean;

export function isSupportedReplaySource(value: string, canPlay: CanPlay) {
  const source = value.trim();
  return isPlayableMediaUrl(source) && (canPlay(source) || isOdyseeSource(source));
}
