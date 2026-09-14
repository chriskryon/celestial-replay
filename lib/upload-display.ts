import { isOwnUploadUrl } from "@/lib/media-url";

export function sanitizeUploadBaseName(name: string) {
  const fallback = "audio";
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (normalized || fallback).slice(0, 80);
}

export function uploadDisplayNameFromPath(pathname: string) {
  const fileName = decodeURIComponent(pathname.split("/").pop() ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/^[a-f0-9]{64}-/, "");
  return fileName || "Áudio enviado";
}

export function uploadDisplayNameFromUrl(url: string) {
  if (!isOwnUploadUrl(url)) return null;
  try {
    return uploadDisplayNameFromPath(new URL(url).pathname);
  } catch {
    return null;
  }
}
