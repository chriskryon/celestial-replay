import { nanoid } from "nanoid";

export function createStack(stackName: string, videoInput: string) {
  const parsedVideos = videoInput
    .split("\n")
    .filter(Boolean)
    .map((video) => {
      const [url, repetitionsStr] = video.split(";");
      const repetitions = parseInt(repetitionsStr, 10) || 1;
      return { url, repetitions };
    });

  // Agrupa vídeos com a mesma URL e soma as repetições
  const groupedVideos = parsedVideos.reduce((acc, video) => {
    if (acc[video.url]) {
      acc[video.url].repetitions += video.repetitions;
    } else {
      acc[video.url] = video;
    }
    return acc;
  }, {} as { [url: string]: { url: string; repetitions: number } });

  const uniqueVideos = Object.values(groupedVideos);

  const stackId = `${stackName}-${nanoid(9)}`;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(stackId, JSON.stringify(uniqueVideos));
  }

  return stackId;
}
