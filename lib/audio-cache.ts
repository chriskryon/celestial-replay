const CACHE_NAME = "celestial-replay-audio";

// Baixa o áudio do Blob uma única vez por URL e reusa a cópia local (Cache API,
// sobrevive a reload/fechar aba) em todas as repetições e sessões seguintes,
// pra não gastar transferência de dados do Blob toda vez que o item tocar.
export async function resolveLocalAudioUrl(remoteUrl: string): Promise<string> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(remoteUrl);
  if (cached) return URL.createObjectURL(await cached.blob());

  const response = await fetch(remoteUrl);
  await cache.put(remoteUrl, response.clone());
  return URL.createObjectURL(await response.blob());
}
