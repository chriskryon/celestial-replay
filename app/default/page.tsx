"use client";
import { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";

function YoutubeViewApp() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [repetitions, setRepetitions] = useState(0);
  const [remainingRepetitions, setRemainingRepetitions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    if (videoUrl) { // Only validate if videoUrl is set
      const urlMatch = videoUrl.match(
        /(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      );

      if (urlMatch) {
        setError(null);
      } else {
        setError("URL inválida. Insira uma URL do YouTube válida.");
      }

      setRemainingRepetitions(repetitions);
    }
  }, [videoUrl, repetitions]); // Dependency array includes videoUrl

  const handlePlay = () => {
    if (repetitions > 0) {
      setVideoUrl(videoUrlInput); // Set videoUrl when play is clicked
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    if (remainingRepetitions > 1) {
      setRemainingRepetitions(remainingRepetitions - 1);
      if (playerRef.current) {
        (playerRef.current as any).getInternalPlayer().playVideo();
      }
    } else {
      setRemainingRepetitions(0);
      setIsPlaying(false);
      setVideoUrl(null); // Clear videoUrl after all repetitions
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {videoUrl && ( // Only render ReactPlayer when videoUrl is set
        <ReactPlayer
          ref={playerRef}
          controls
          height="300px"
          playing={isPlaying}
          url={videoUrl}
          width="100%"
          onEnded={handleEnded}
        />
      )}

      <Input
        fullWidth
        className="w-full max-w-xl"
        color={error ? "danger" : "default"}
        errorMessage={error}
        label="URL do vídeo do YouTube"
        placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        value={videoUrlInput} // Bind to the input field state
        onChange={(e) => setVideoUrlInput(e.target.value)}
      />

      <Input
        fullWidth
        className="w-full max-w-xl"
        label="Quantidade de Repetições"
        type="number"
        value={repetitions.toString()}
        onChange={(e) => setRepetitions(parseInt(e.target.value, 10) || 0)}
      />

      {isPlaying && remainingRepetitions > 0 && (
        <div className="text-center mb-2">
          Remaining Repetitions: {remainingRepetitions}
        </div>
      )}

      <Button
        className="w-full max-w-xl"
        color="primary"
        disabled={error !== null || repetitions <= 0}
        onClick={handlePlay}
      >
        Iniciar
      </Button>
    </div>
  );
}

export default YoutubeViewApp;
