// utils/validateUrls.ts

import ReactPlayer from "react-player";

export default function validateInputs(videoInput: string): boolean {
  if (!videoInput) return false;

  const lines = videoInput.split("\n");

  for (const line of lines) {
    const [url, repetitionsStr] = line.split(";");

    if (!ReactPlayer.canPlay(url)) {
      return false;
    }

    const repetitions = parseInt(repetitionsStr, 10);

    if (isNaN(repetitions) || repetitions < 1) {
      return false;
    }
  }

  return true;
}
