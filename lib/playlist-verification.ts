export type PlaylistVerificationStatus = "checking" | "ready" | "unavailable" | "unconfirmed";

export type PlaylistVerificationItem = {
  id: string;
  source: string;
  status: PlaylistVerificationStatus;
  message: string;
};

export type PlaylistVerificationTarget = Pick<PlaylistVerificationItem, "id" | "source">;

const youtubeIdPattern = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i;

export function youtubeIdFromSource(source: string) {
  return source.match(youtubeIdPattern)?.[1] ?? null;
}

export function isYoutubeSource(source: string) {
  return youtubeIdFromSource(source) !== null;
}
