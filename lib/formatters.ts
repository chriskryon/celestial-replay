export function formatTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours > 0 ? `${hours}:` : ""}${hours > 0 ? String(minutes).padStart(2, "0") : String(minutes)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
export function formatRemainingTime(seconds: number) { const roundedMinutes = Math.max(1, Math.ceil(seconds / 60)); const hours = Math.floor(roundedMinutes / 60); const minutes = roundedMinutes % 60; return hours > 0 ? `${hours} h ${minutes ? `${minutes} min` : ""}`.trim() : `${minutes} min`; }
export function getHostname(value: string, fallback = "") { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return fallback; } }
